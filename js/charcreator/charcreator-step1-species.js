import { VetoolsConfig } from "../utils-config/utils-config-config.js";
import { SITE_STYLE__ONE } from "../consts.js";

export class CharacterCreatorStep1Species extends BaseComponent {
    constructor({ parent }) {
        super();
        this._parent = parent;
    }

    render(wrpTab) {
        const wrp = ee`<div class="ve-flex-col w-100 h-100 p-2 charcreator__step">
			<h3 class="mb-3">Choose Your Species</h3>
			<p class="mb-3">Your species determines your character's physical traits and some abilities. The 2024 Player's Handbook uses "species" instead of "race".</p>

			<div class="ve-flex-col mb-3" id="species-selector"></div>
			<div class="ve-flex-col" id="species-preview"></div>

			<div class="ve-flex-v-center mt-auto pt-3">
				<button class="ve-btn ve-btn-primary ml-auto" id="btn-species-next">Next: Choose Class →</button>
			</div>
		</div>`;

        wrpTab.append(wrp);

        this._renderSpeciesSelector(wrp.querySelector("#species-selector"));
        this._renderSpeciesPreview(wrp.querySelector("#species-preview"));
        this._bindNavigation(wrp);
    }

    _renderSpeciesSelector(container) {
        const styleHint = VetoolsConfig.get("styleSwitcher", "style");

        // Filter to 2024 PHB content (edition: "one") if available, else show all
        const races2024 = this._parent.races.filter(r => r.source === "XPHB" || r.edition === "one");
        const racesToShow = races2024.length > 0 ? races2024 : this._parent.races;

        // Group by source
        const racesBySource = {};
        racesToShow.forEach(race => {
            const source = race.source;
            if (!racesBySource[source]) racesBySource[source] = [];
            racesBySource[source].push(race);
        });

        const wrpSelector = ee`<div class="ve-flex-col"></div>`;

        // Quick filter
        const iptFilter = ee`<input type="text" class="form-control mb-2" placeholder="Filter species...">`;
        iptFilter.onn("input", () => this._filterSpecies(iptFilter.value));
        wrpSelector.append(iptFilter);

        // Species buttons/cards
        const wrpCards = ee`<div class="ve-flex ve-flex-wrap gap-2 charcreator__species-grid" id="species-cards"></div>`;

        racesToShow
            .sort((a, b) => SortUtil.ascSortLower(a.name, b.name))
            .forEach((race, ix) => {
                const isSelected = this._parent._state.char_ixSpecies === this._parent.races.indexOf(race);
                const card = ee`<button class="ve-btn ${isSelected ? "ve-btn-primary" : "ve-btn-default"} charcreator__species-card" data-ix="${this._parent.races.indexOf(race)}">
					<div class="charcreator__species-card-name">${race.name}</div>
					<div class="charcreator__species-card-source ve-muted ve-small">${Parser.sourceJsonToAbv(race.source)}</div>
				</button>`;

                card.onn("click", () => this._selectSpecies(this._parent.races.indexOf(race)));
                wrpCards.append(card);
            });

        wrpSelector.append(wrpCards);

        // Open full filter modal button
        const btnOpenFilter = ee`<button class="ve-btn ve-btn-default ve-btn-xs mt-2">
			<span class="glyphicon glyphicon-filter"></span> Advanced Filter
		</button>`;
        btnOpenFilter.onn("click", async () => {
            const selected = await this._parent.modalFilterRaces.pGetUserSelection();
            if (selected?.length) {
                const sel = selected[0];
                const ix = this._parent.races.findIndex(r => r.name === sel.name && r.source === sel.values.sourceJson);
                if (~ix) this._selectSpecies(ix);
            }
        });
        wrpSelector.append(btnOpenFilter);

        container.append(wrpSelector);
    }

    _filterSpecies(filter) {
        const cards = document.querySelectorAll(".charcreator__species-card");
        const filterLower = filter.toLowerCase();
        cards.forEach(card => {
            const name = card.querySelector(".charcreator__species-card-name").textContent.toLowerCase();
            card.toggleVe(name.includes(filterLower));
        });
    }

    _selectSpecies(ix) {
        this._parent._state.char_ixSpecies = ix;

        // Update button states
        document.querySelectorAll(".charcreator__species-card").forEach(card => {
            const cardIx = Number(card.dataset.ix);
            card.classList.toggle("ve-btn-primary", cardIx === ix);
            card.classList.toggle("ve-btn-default", cardIx !== ix);
        });

        // Update preview
        this._updatePreview();
    }

    _renderSpeciesPreview(container) {
        const wrp = ee`<div class="ve-flex-col p-2 charcreator__preview" id="species-preview-content">
			<div class="ve-muted ve-text-center">Select a species to see details</div>
		</div>`;
        container.append(wrp);

        // Initial update if species already selected
        if (this._parent._state.char_ixSpecies != null) {
            this._updatePreview();
        }

        // Hook for changes
        this._parent._addHookBase("char_ixSpecies", () => this._updatePreview());
    }

    _updatePreview() {
        const container = document.querySelector("#species-preview-content");
        if (!container) return;

        const ix = this._parent._state.char_ixSpecies;
        if (ix == null) {
            container.innerHTML = `<div class="ve-muted ve-text-center">Select a species to see details</div>`;
            return;
        }

        const race = this._parent.races[ix];
        if (!race) return;

        const renderer = Renderer.get();

        // Build preview content
        let html = `<h4 class="mb-2">${race.name}</h4>`;

        // Size
        if (race.size) {
            const sizes = race.size.map(s => Parser.sizeAbvToFull(s));
            html += `<div class="mb-1"><strong>Size:</strong> ${sizes.join(" or ")}</div>`;
        }

        // Speed
        if (race.speed) {
            let speedStr = "";
            if (typeof race.speed === "number") {
                speedStr = `${race.speed} ft.`;
            } else if (race.speed.walk) {
                speedStr = `${race.speed.walk} ft.`;
                if (race.speed.fly) speedStr += `, fly ${race.speed.fly === true ? "equal to walking" : `${race.speed.fly} ft.`}`;
                if (race.speed.swim) speedStr += `, swim ${race.speed.swim === true ? "equal to walking" : `${race.speed.swim} ft.`}`;
                if (race.speed.climb) speedStr += `, climb ${race.speed.climb === true ? "equal to walking" : `${race.speed.climb} ft.`}`;
            }
            html += `<div class="mb-1"><strong>Speed:</strong> ${speedStr}</div>`;
        }

        // Creature type (2024 PHB)
        if (race.creatureTypes) {
            html += `<div class="mb-1"><strong>Creature Type:</strong> ${race.creatureTypes.map(t => t.uppercaseFirst()).join(", ")}</div>`;
        }

        // Traits
        if (race.entries) {
            html += `<div class="mt-2"><strong>Traits:</strong></div>`;
            const textStack = [];
            race.entries.forEach(entry => {
                renderer.recursiveRender(entry, textStack);
            });
            html += `<div class="charcreator__preview-entries">${textStack.join("")}</div>`;
        }

        // Source
        html += `<div class="mt-2 ve-muted ve-small">Source: ${Parser.sourceJsonToFull(race.source)}</div>`;

        container.innerHTML = html;

        // Bind dice roller handlers
        Renderer.dice.bindOnclickListener(container);
    }

    _bindNavigation(wrp) {
        const btnNext = wrp.querySelector("#btn-species-next");
        btnNext.addEventListener("click", () => {
            if (this._parent._state.char_ixSpecies == null) {
                JqueryUtil.doToast({ type: "warning", content: "Please select a species first!" });
                return;
            }
            this._parent.ixActiveTab = 1; // Go to Class step
        });
    }
}
