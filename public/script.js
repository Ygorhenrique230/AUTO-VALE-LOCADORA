"use strict";

/**
 * @typedef {Object} Vehicle
 * @property {string}  id
 * @property {string}  name
 * @property {string}  category
 * @property {number}  year
 * @property {number}  mileageKm
 * @property {boolean} isAvailable
 * @property {string}  color  Hex color (#rrggbb) used by the placeholder image
 */

/* ---------- Configuration ---------- */
const CONTACT_WHATSAPP_NUMBER = "5543999999999"; // TODO: replace with the real number
const INSTAGRAM_URL = "https://www.instagram.com/autovalelocadora"; // TODO: replace with the real profile

/* ---------- Data source (swap for an API-backed implementation if needed) ---------- */
class ApiVehicleRepository {
  /** @returns {Promise<unknown[]>} */
  async findAll() {
    const response = await fetch("/api/vehicles", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

/* ---------- Validation ---------- */
class VehicleValidator {
  /** @param {any} raw @returns {Vehicle} @throws {Error} */
  static validate(raw) {
    const maxYear = new Date().getFullYear() + 1;
    const isText = (value) => typeof value === "string" && value.trim().length > 0;
    if (!raw || !isText(raw.id) || !isText(raw.name) || !isText(raw.category)) {
      throw new Error("Veículo com campos de texto inválidos.");
    }
    if (!Number.isInteger(raw.year) || raw.year < 1980 || raw.year > maxYear) {
      throw new Error(`Ano inválido para o veículo ${raw.id}.`);
    }
    if (!Number.isFinite(raw.mileageKm) || raw.mileageKm < 0) {
      throw new Error(`Quilometragem inválida para o veículo ${raw.id}.`);
    }
    if (typeof raw.isAvailable !== "boolean") {
      throw new Error(`Disponibilidade inválida para o veículo ${raw.id}.`);
    }
        if (typeof raw.description !== "string") {
      throw new Error(`Descrição inválida para o veículo ${raw.id}.`);
    }
    if (raw.photoUrl !== null && !String(raw.photoUrl).startsWith("/uploads/")) {
      throw new Error(`Foto inválida para o veículo ${raw.id}.`);
    }
    return raw;
  }
}

/* ---------- Sorting: newest year first, then lowest mileage ---------- */
class NewestFirstSortStrategy {
  /** @param {Vehicle[]} vehicles @returns {Vehicle[]} */
  sort(vehicles) {
    return [...vehicles].sort((a, b) => b.year - a.year || a.mileageKm - b.mileageKm);
  }
}

/* ---------- Filtering ---------- */
class VehicleFilter {
  /**
   * @param {Vehicle[]} vehicles
   * @param {{text: string, category: string, onlyAvailable: boolean}} criteria
   * @returns {Vehicle[]}
   */
  apply(vehicles, { text, category, onlyAvailable }) {
    const query = text.trim().toLowerCase();
    return vehicles.filter((vehicle) =>
      (!query || vehicle.name.toLowerCase().includes(query)) &&
      (!category || vehicle.category === category) &&
      (!onlyAvailable || vehicle.isAvailable)
    );
  }
}

/* ---------- Placeholder image (replace with real photos later) ---------- */
class PlaceholderImageFactory {
  /** @param {string} color @returns {string} data URI */
  static create(color) {
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'>` +
      `<rect width='400' height='240' fill='#eaf1ff'/>` +
      `<path d='M70 150 L100 105 Q110 92 130 92 H270 Q290 92 302 108 L335 150 Z' fill='${color}'/>` +
      `<path d='M112 140 L128 108 H198 V140 Z M208 140 V108 H268 L292 140 Z' fill='#cfe3f5'/>` +
      `<rect x='45' y='140' width='310' height='38' rx='14' fill='${color}'/>` +
      `<circle cx='115' cy='182' r='24' fill='#1c232b'/><circle cx='115' cy='182' r='10' fill='#b7c0ca'/>` +
      `<circle cx='285' cy='182' r='24' fill='#1c232b'/><circle cx='285' cy='182' r='10' fill='#b7c0ca'/>` +
      `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}

/* ---------- Rendering (textContent only, so no XSS vector) ---------- */
class VehicleCardRenderer {
  constructor() {
    this.numberFormat = new Intl.NumberFormat("pt-BR");
  }

  /** @param {Vehicle} vehicle @returns {HTMLElement} */
  render(vehicle) {
    const card = this.#element("article", "vehicle-card");
    if (!vehicle.isAvailable) card.classList.add("vehicle-card--unavailable");

    const media = this.#element("div", "vehicle-card__media");
    const image = this.#element("img", "vehicle-card__image");
    image.src = vehicle.photoUrl ?? PlaceholderImageFactory.create("#1e63c4");
    image.alt = `${vehicle.name}, ano ${vehicle.year}`;
    image.loading = "lazy";
    media.append(image, this.#element("span", "vehicle-card__badge", vehicle.isAvailable ? "Disponível" : "Indisponível"));

    const body = this.#element("div", "vehicle-card__body");
        body.append(
      ...[
        this.#element("p", "vehicle-card__category", vehicle.category),
        this.#element("h3", "vehicle-card__name", vehicle.name),
        vehicle.description ? this.#element("p", "vehicle-card__description", vehicle.description) : null,
        this.#renderSpecs(vehicle),
        this.#renderAction(vehicle),
      ].filter(Boolean)
    );

    card.append(media, body);
    return card;
  }

  /** @param {Vehicle} vehicle */
  #renderSpecs(vehicle) {
    const list = this.#element("dl", "vehicle-card__specs");
    const entries = [
      ["Ano", String(vehicle.year)],
      ["Quilometragem", `${this.numberFormat.format(vehicle.mileageKm)} km`],
    ];
    for (const [label, value] of entries) {
      const group = document.createElement("div");
      group.append(this.#element("dt", "", label), this.#element("dd", "", value));
      list.append(group);
    }
    return list;
  }

  /** @param {Vehicle} vehicle */
  #renderAction(vehicle) {
    const button = this.#element("button", "vehicle-card__action", vehicle.isAvailable ? "Reservar" : "Indisponível");
    button.type = "button";
    button.disabled = !vehicle.isAvailable;
    if (vehicle.isAvailable) {
      button.addEventListener("click", () => {
        const message = encodeURIComponent(`Olá! Tenho interesse em alugar o ${vehicle.name} ${vehicle.year}.`);
        window.open(`https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${message}`, "_blank", "noopener");
      });
    }
    return button;
  }

  #element(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
}

/* ---------- Fade in/out while scrolling ---------- */
class ScrollReveal {
  constructor() {
    this.observer = this.#createObserver();
  }

  /** @param {HTMLElement} element */
  watch(element) {
    if (this.observer) this.observer.observe(element);
    else element.style.setProperty("--visibility", "1");
  }

  reset() {
    if (this.observer) this.observer.disconnect();
  }

  #createObserver() {
    if (!("IntersectionObserver" in window)) return null;
    const thresholds = Array.from({ length: 21 }, (_, step) => step / 20);
    return new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const visibility = Math.min(1, entry.intersectionRatio * 1.3);
        entry.target.style.setProperty("--visibility", visibility.toFixed(2));
      }
    }, { threshold: thresholds });
  }
}

/* ---------- Footer links ---------- */
class SocialLinksBinder {
  static bind() {
    const targets = [
      ["social-instagram", INSTAGRAM_URL],
      ["social-whatsapp", `https://wa.me/${CONTACT_WHATSAPP_NUMBER}`],
    ];
    for (const [elementId, url] of targets) {
      const link = document.getElementById(elementId);
      if (link instanceof HTMLAnchorElement) link.href = url;
    }
  }
}

/* ---------- Page controller ---------- */
class FleetPage {
  constructor({ grid, counter, form, repository, sortStrategy, filter, renderer, reveal }) {
    Object.assign(this, { grid, counter, form, repository, sortStrategy, filter, renderer, reveal });
    this.vehicles = [];
    this.textInput = form.querySelector("#search-text");
    this.categorySelect = form.querySelector("#search-category");
    this.availableCheckbox = form.querySelector("#search-available");
  }

  async mount() {
    try {
      const rawVehicles = await this.repository.findAll();
      this.vehicles = this.sortStrategy.sort(rawVehicles.map((raw) => VehicleValidator.validate(raw)));
      this.#fillCategories();
      this.#bindEvents();
      this.#renderList();
    } catch (error) {
      console.error("Falha ao carregar a frota:", error);
      this.#showMessage("Não foi possível carregar a frota no momento. Tente novamente mais tarde.");
    }
  }

  #fillCategories() {
    const categories = [...new Set(this.vehicles.map((vehicle) => vehicle.category))].sort();
    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      this.categorySelect.append(option);
    }
  }

  #bindEvents() {
    const refresh = () => this.#renderList();
    this.form.addEventListener("submit", (event) => event.preventDefault());
    this.textInput.addEventListener("input", refresh);
    this.categorySelect.addEventListener("change", refresh);
    this.availableCheckbox.addEventListener("change", refresh);
  }

  #renderList() {
    const results = this.filter.apply(this.vehicles, {
      text: this.textInput.value,
      category: this.categorySelect.value,
      onlyAvailable: this.availableCheckbox.checked,
    });

    this.reveal.reset();
    this.grid.replaceChildren();
    this.counter.textContent = results.length === 1 ? "1 veículo encontrado" : `${results.length} veículos encontrados`;

    if (results.length === 0) {
      this.#showMessage("Nenhum veículo encontrado com esses filtros.");
      return;
    }
    for (const vehicle of results) {
      const card = this.renderer.render(vehicle);
      this.grid.append(card);
      this.reveal.watch(card);
    }
  }

  #showMessage(text) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = text;
    this.grid.replaceChildren(message);
  }
}

/* ---------- Composition root ---------- */
SocialLinksBinder.bind();

const grid = document.getElementById("vehicle-grid");
const counter = document.getElementById("result-count");
const form = document.getElementById("search-form");

if (grid && counter && form) {
  new FleetPage({
    grid, counter, form,
    repository: new ApiVehicleRepository(),
    sortStrategy: new NewestFirstSortStrategy(),
    filter: new VehicleFilter(),
    renderer: new VehicleCardRenderer(),
    reveal: new ScrollReveal(),
  }).mount();
}