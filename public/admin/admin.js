"use strict";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const NO_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 84 56'><rect width='84' height='56' fill='#e3eeff'/></svg>")}`;

/* ---------- API access ---------- */
class ApiClient {
  async #request(url, options = {}) {
    let response;
    try {
      response = await fetch(url, { credentials: "same-origin", ...options });
    } catch {
      throw new Error("Sem conexão com o servidor.");
    }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error ?? "Erro inesperado.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  session() { return this.#request("/api/admin/session"); }
  login(username, password) {
    return this.#request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  }
  logout() { return this.#request("/api/admin/logout", { method: "POST" }); }
  listVehicles() { return this.#request("/api/vehicles"); }
  saveVehicle(id, formData) {
    const url = id ? `/api/admin/vehicles/${encodeURIComponent(id)}` : "/api/admin/vehicles";
    return this.#request(url, { method: id ? "PUT" : "POST", body: formData });
  }
  deleteVehicle(id) {
    return this.#request(`/api/admin/vehicles/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}

/* ---------- Vehicle list (textContent only, so no XSS vector) ---------- */
class VehicleListView {
  constructor(listElement, onSelect) {
    this.list = listElement;
    this.onSelect = onSelect;
    this.numberFormat = new Intl.NumberFormat("pt-BR");
  }

  render(vehicles, selectedId) {
    if (vehicles.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "Nenhum veículo cadastrado ainda.";
      this.list.replaceChildren(empty);
      return;
    }
    const sorted = [...vehicles].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
    this.list.replaceChildren(...sorted.map((vehicle) => this.#createItem(vehicle, vehicle.id === selectedId)));
  }

  #createItem(vehicle, isSelected) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = vehicle.isAvailable ? "vehicle-item" : "vehicle-item vehicle-item--off";
    if (isSelected) button.setAttribute("aria-current", "true");
    button.addEventListener("click", () => this.onSelect(vehicle.id));

    const image = document.createElement("img");
    image.src = vehicle.photoUrl ?? NO_PHOTO;
    image.alt = "";

    const info = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = vehicle.name;
    const details = document.createElement("small");
    const status = vehicle.isAvailable ? "Disponível" : "Indisponível";
    details.textContent = `${vehicle.year} · ${this.numberFormat.format(vehicle.mileageKm)} km · ${status}`;
    info.append(name, details);

    button.append(image, info);
    item.append(button);
    return item;
  }
}

/* ---------- Create/edit form ---------- */
class VehicleFormView {
  constructor(form) {
    this.form = form;
    this.currentId = null;
    this.title = form.querySelector("#form-title");
    this.preview = form.querySelector("#photo-preview");
    this.deleteButton = form.querySelector("#delete-button");
    this.message = form.querySelector("#form-message");
    this.photoInput = form.elements.photo;
    this.photoInput.addEventListener("change", () => this.#onPhotoSelected());
  }

  load(vehicle) {
    this.form.reset();
    this.currentId = vehicle?.id ?? null;
    this.title.textContent = vehicle ? "Editar veículo" : "Novo veículo";
    this.deleteButton.hidden = !vehicle;
    this.#setPreview(vehicle?.photoUrl ?? null);
    this.setMessage("");
    if (!vehicle) return;
    for (const field of ["name", "category", "year", "mileageKm", "description"]) {
      this.form.elements[field].value = vehicle[field];
    }
    this.form.elements.isAvailable.checked = vehicle.isAvailable;
  }

  buildFormData() {
    const data = new FormData(this.form);
    data.set("isAvailable", String(this.form.elements.isAvailable.checked));
    if (this.photoInput.files.length === 0) data.delete("photo");
    return data;
  }

  setMessage(text, kind = "") {
    this.message.textContent = text;
    this.message.className = kind ? `message message--${kind}` : "message";
  }

  #onPhotoSelected() {
    const [file] = this.photoInput.files;
    if (!file) return this.#setPreview(null);
    if (file.size > MAX_PHOTO_BYTES) {
      this.photoInput.value = "";
      this.#setPreview(null);
      return this.setMessage("A foto deve ter no máximo 5 MB.", "error");
    }
    this.setMessage("");
    return this.#setPreview(URL.createObjectURL(file));
  }

  #setPreview(url) {
    this.preview.hidden = !url;
    if (url) this.preview.src = url;
    else this.preview.removeAttribute("src");
  }
}

/* ---------- Application ---------- */
class AdminApp {
  constructor(api) {
    this.api = api;
    this.vehicles = [];
    this.loginView = document.getElementById("login-view");
    this.panelView = document.getElementById("panel-view");
    this.loginMessage = document.getElementById("login-message");
    this.form = new VehicleFormView(document.getElementById("vehicle-form"));
    this.list = new VehicleListView(document.getElementById("vehicle-list"), (id) => this.#select(id));
  }

  async start() {
    this.#bindEvents();
    try {
      const { authenticated } = await this.api.session();
      if (authenticated) await this.#showPanel();
      else this.#showLogin();
    } catch {
      this.#showLogin();
    }
  }

  #bindEvents() {
    document.getElementById("login-form").addEventListener("submit", (event) => this.#handleLogin(event));
    document.getElementById("logout-button").addEventListener("click", () => this.#handleLogout());
    document.getElementById("new-button").addEventListener("click", () => this.#select(null));
    document.getElementById("delete-button").addEventListener("click", () => this.#handleDelete());
    this.form.form.addEventListener("submit", (event) => this.#handleSave(event));
  }

  #showLogin() {
    this.panelView.hidden = true;
    this.loginView.hidden = false;
  }

  async #showPanel() {
    this.loginView.hidden = true;
    this.panelView.hidden = false;
    await this.#reload(null);
  }

  async #reload(selectedId) {
    this.vehicles = await this.api.listVehicles();
    this.#select(selectedId);
  }

  #select(id) {
    const vehicle = this.vehicles.find((item) => item.id === id) ?? null;
    this.form.load(vehicle);
    this.list.render(this.vehicles, vehicle?.id);
  }

  async #handleLogin(event) {
    event.preventDefault();
    const loginForm = event.currentTarget;
    const data = new FormData(loginForm);
    try {
      await this.api.login(data.get("username"), data.get("password"));
      loginForm.reset();
      this.loginMessage.textContent = "";
      await this.#showPanel();
    } catch (error) {
      this.loginMessage.textContent = error.message;
      this.loginMessage.className = "message message--error";
    }
  }

  async #handleLogout() {
    try { await this.api.logout(); } finally { this.#showLogin(); }
  }

  async #handleSave(event) {
    event.preventDefault();
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    try {
      const saved = await this.api.saveVehicle(this.form.currentId, this.form.buildFormData());
      await this.#reload(saved.id);
      this.form.setMessage("Veículo salvo com sucesso.", "ok");
    } catch (error) {
      this.#handleError(error);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  async #handleDelete() {
    const vehicle = this.vehicles.find((item) => item.id === this.form.currentId);
    if (!vehicle || !window.confirm(`Excluir "${vehicle.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await this.api.deleteVehicle(vehicle.id);
      await this.#reload(null);
      this.form.setMessage("Veículo excluído.", "ok");
    } catch (error) {
      this.#handleError(error);
    }
  }

  #handleError(error) {
    if (error.status === 401) return this.#showLogin();
    return this.form.setMessage(error.message, "error");
  }
}

new AdminApp(new ApiClient()).start();