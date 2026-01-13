import { VetoolsConfig } from "../utils-config/utils-config-config.js";

export class CharacterCreatorStep3Background extends BaseComponent {
    constructor({ parent }) {
        super();
        this._parent = parent;
    }

    render(wrpTab) {
        const wrp = ee`<div class="ve-flex-col w-100 h-100 p-2 charcreator__step">
			<h3 class="mb-3">Choose Your Background</h3>
			<p class="mb-3">Your background describes your character's history and grants proficiencies, languages, equipment, and a feat (in the 2024 rules).</p>

			<div class="ve-flex-col mb-3" id="background-selector"></div>
			<div class="ve-flex-col" id="background-preview"></div>

			<div class="ve-flex-v-center mt-auto pt-3">
				<button class="ve-btn ve-btn-default" id="btn-bg-prev">← Previous: Class</button>
				<button class="ve-btn ve-btn-primary ml-auto" id="btn-bg-next">Next: Ability Scores →</button>
			</div>
		</div>`;

        wrpTab.append(wrp);

        this._renderBackgroundSelector(wrp.querySelector("#background-selector"));
        this._renderBackgroundPreview(wrp.querySelector("#background-preview"));
        this._bindNavigation(wrp);
    }

    _renderBackgroundSelector(container) {
        // Filter to 2024 PHB content
        const backgrounds2024 = this._parent.backgrounds.filter(b => b.source === "XPHB" || b.edition === "one");
        const backgroundsToShow = backgrounds2024.length > 0 ? backgrounds2024 : this._parent.backgrounds;

        const wrpSelector = ee`<div class="ve-flex-col"></div>`;

        // Quick filter
        const iptFilter = ee`<input type="text" class="form-control mb-2" placeholder="Filter backgrounds...">`;
        iptFilter.onn("input", () => this._filterBackgrounds(iptFilter.value));
        wrpSelector.append(iptFilter);

        // Background buttons/cards
        const wrpCards = ee`<div class="ve-flex ve-flex-wrap gap-2 charcreator__background-grid" id="background-cards"></div>`;

        backgroundsToShow
            .sort((a, b) => SortUtil.ascSortLower(a.name, b.name))
            .forEach((bg) => {
                const globalIx = this._parent.backgrounds.indexOf(bg);
                const isSelected = this._parent._state.char_ixBackground === globalIx;

                // Get feat name if available (2024 backgrounds grant a feat)
                let featName = "";
                if (bg.feats) {
                    const featObj = bg.feats[0];
                    if (featObj) {
                        const featKey = Object.keys(featObj).find(k => featObj[k] === true);
                        if (featKey) {
                            featName = featKey.split("|")[0].uppercaseFirst();
                        }
                    }
                }

                const card = ee`<button class="ve-btn ${isSelected ? "ve-btn-primary" : "ve-btn-default"} charcreator__background-card" data-ix="${globalIx}">
					<div class="charcreator__background-card-name">${bg.name}</div>
					${featName ? `<div class="charcreator__background-card-feat ve-muted ve-small">Feat: ${featName}</div>` : ""}
					<div class="charcreator__background-card-source ve-muted ve-small">${Parser.sourceJsonToAbv(bg.source)}</div>
				</button>`;

                card.onn("click", () => this._selectBackground(globalIx));
                wrpCards.append(card);
            });

        wrpSelector.append(wrpCards);

        // Open full filter modal button
        const btnOpenFilter = ee`<button class="ve-btn ve-btn-default ve-btn-xs mt-2">
			<span class="glyphicon glyphicon-filter"></span> Advanced Filter
		</button>`;
        btnOpenFilter.onn("click", async () => {
            const selected = await this._parent.modalFilterBackgrounds.pGetUserSelection();
            if (selected?.length) {
                const sel = selected[0];
                const ix = this._parent.backgrounds.findIndex(b => b.name === sel.name && b.source === sel.values.sourceJson);
                if (~ix) this._selectBackground(ix);
            }
        });
        wrpSelector.append(btnOpenFilter);

        container.append(wrpSelector);
    }

    _filterBackgrounds(filter) {
        const cards = document.querySelectorAll(".charcreator__background-card");
        const filterLower = filter.toLowerCase();
        cards.forEach(card => {
            const name = card.querySelector(".charcreator__background-card-name").textContent.toLowerCase();
            card.toggleVe(name.includes(filterLower));
        });
    }

    _selectBackground(ix) {
        this._parent._state.char_ixBackground = ix;

        // Update button states
        document.querySelectorAll(".charcreator__background-card").forEach(card => {
            const cardIx = Number(card.dataset.ix);
            card.classList.toggle("ve-btn-primary", cardIx === ix);
            card.classList.toggle("ve-btn-default", cardIx !== ix);
        });

        // Update preview
        this._updatePreview();
    }

    _renderBackgroundPreview(container) {
        const wrp = ee`<div class="ve-flex-col p-2 charcreator__preview" id="background-preview-content">
			<div class="ve-muted ve-text-center">Select a background to see details</div>
		</div>`;
        container.append(wrp);

        if (this._parent._state.char_ixBackground != null) {
            this._updatePreview();
        }

        this._parent._addHookBase("char_ixBackground", () => this._updatePreview());
    }

    _updatePreview() {
        const container = document.querySelector("#background-preview-content");
        if (!container) return;

        const ix = this._parent._state.char_ixBackground;
        if (ix == null) {
            container.innerHTML = `<div class="ve-muted ve-text-center">Select a background to see details</div>`;
            return;
        }

        const bg = this._parent.backgrounds[ix];
        if (!bg) return;

        const renderer = Renderer.get();

        let html = `<h4 class="mb-2">${bg.name}</h4>`;

        // Ability Scores (2024 backgrounds)
        if (bg.ability) {
            const abilityStrs = bg.ability.map(ab => {
                if (ab.choose) {
                    const weights = ab.choose.weighted;
                    if (weights) {
                        return `Choose from ${weights.from.map(a => a.toUpperCase()).join(", ")}`;
                    }
                    return "Choose ability scores";
                }
                return Object.entries(ab).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(", ");
            });
            html += `<div class="mb-1"><strong>Ability Scores:</strong> ${abilityStrs.join(" or ")}</div>`;
        }

        // Feat (2024 backgrounds)
        if (bg.feats) {
            const featNames = bg.feats.map(featObj => {
                const featKey = Object.keys(featObj).find(k => featObj[k] === true);
                if (featKey) {
                    return featKey.split("|")[0].uppercaseFirst();
                }
                return null;
            }).filter(Boolean);
            if (featNames.length) {
                html += `<div class="mb-1"><strong>Feat:</strong> ${featNames.join(", ")}</div>`;
            }
        }

        // Skill Proficiencies
        if (bg.skillProficiencies) {
            const skills = bg.skillProficiencies.map(sp => {
                return Object.keys(sp).filter(k => sp[k] === true).map(s => s.uppercaseFirst());
            }).flat();
            if (skills.length) {
                html += `<div class="mb-1"><strong>Skill Proficiencies:</strong> ${skills.join(", ")}</div>`;
            }
        }

        // Tool Proficiencies
        if (bg.toolProficiencies) {
            const tools = bg.toolProficiencies.map(tp => {
                return Object.keys(tp).filter(k => tp[k] === true).map(t => t.uppercaseFirst());
            }).flat();
            if (tools.length) {
                html += `<div class="mb-1"><strong>Tool Proficiencies:</strong> ${tools.join(", ")}</div>`;
            }
        }

        // Language Proficiencies
        if (bg.languageProficiencies) {
            const langs = bg.languageProficiencies.map(lp => {
                const specific = Object.keys(lp).filter(k => lp[k] === true);
                const anyStandard = lp.anyStandard;
                let str = specific.map(l => l.uppercaseFirst()).join(", ");
                if (anyStandard) {
                    str += `${str ? ", " : ""}${anyStandard} language${anyStandard > 1 ? "s" : ""} of your choice`;
                }
                return str;
            }).filter(Boolean);
            if (langs.length) {
                html += `<div class="mb-1"><strong>Languages:</strong> ${langs.join("; ")}</div>`;
            }
        }

        // Starting Equipment
        if (bg.startingEquipment) {
            html += `<div class="mt-2"><strong>Starting Equipment:</strong></div>`;
            const eqList = this._formatStartingEquipment(bg.startingEquipment);
            html += `<div class="charcreator__preview-entries">${eqList}</div>`;
        }

        // Entries/Description
        if (bg.entries) {
            html += `<div class="mt-2"><strong>Description:</strong></div>`;
            const textStack = [];
            bg.entries.forEach(entry => {
                renderer.recursiveRender(entry, textStack);
            });
            html += `<div class="charcreator__preview-entries">${textStack.join("")}</div>`;
        }

        // Source
        html += `<div class="mt-2 ve-muted ve-small">Source: ${Parser.sourceJsonToFull(bg.source)}</div>`;

        container.innerHTML = html;
        Renderer.dice.bindOnclickListener(container);
    }

    _formatStartingEquipment(startingEquipment) {
        if (!startingEquipment) return "";

        let result = "<ul class='mb-0'>";

        startingEquipment.forEach(eq => {
            if (eq._) {
                eq._.forEach(item => {
                    if (typeof item === "string") {
                        result += `<li>${item}</li>`;
                    } else if (item.item) {
                        const qty = item.quantity ? `${item.quantity}× ` : "";
                        result += `<li>${qty}${item.displayName || item.item.split("|")[0]}</li>`;
                    } else if (item.special) {
                        const qty = item.quantity ? `${item.quantity}× ` : "";
                        result += `<li>${qty}${item.special}</li>`;
                    } else if (item.value) {
                        result += `<li>${item.value / 100} gp</li>`;
                    }
                });
            } else {
                // Handle a/b choice format
                Object.entries(eq).forEach(([key, items]) => {
                    if (key === "_") return;
                    result += `<li><strong>Option ${key.toUpperCase()}:</strong><ul>`;
                    items.forEach(item => {
                        if (typeof item === "string") {
                            result += `<li>${item}</li>`;
                        } else if (item.item) {
                            const qty = item.quantity ? `${item.quantity}× ` : "";
                            result += `<li>${qty}${item.displayName || item.item.split("|")[0]}</li>`;
                        } else if (item.value) {
                            result += `<li>${item.value / 100} gp</li>`;
                        }
                    });
                    result += `</ul></li>`;
                });
            }
        });

        result += "</ul>";
        return result;
    }

    _bindNavigation(wrp) {
        const btnPrev = wrp.querySelector("#btn-bg-prev");
        const btnNext = wrp.querySelector("#btn-bg-next");

        btnPrev.addEventListener("click", () => {
            this._parent.ixActiveTab = 1;
        });

        btnNext.addEventListener("click", () => {
            if (this._parent._state.char_ixBackground == null) {
                JqueryUtil.doToast({ type: "warning", content: "Please select a background first!" });
                return;
            }
            this._parent.ixActiveTab = 3;
        });
    }
}
