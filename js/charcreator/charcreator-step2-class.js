import { VetoolsConfig } from "../utils-config/utils-config-config.js";

export class CharacterCreatorStep2Class extends BaseComponent {
    constructor({ parent }) {
        super();
        this._parent = parent;
    }

    render(wrpTab) {
        const wrp = ee`<div class="ve-flex-col w-100 h-100 p-2 charcreator__step">
			<h3 class="mb-3">Choose Your Class</h3>
			<p class="mb-3">Your class defines your character's abilities, skills, and role in the party. Each class has unique features and a subclass you'll choose at level 3.</p>

			<div class="ve-flex-col mb-3" id="class-selector"></div>
			<div class="ve-flex-col" id="class-preview"></div>

			<div class="ve-flex-v-center mt-auto pt-3">
				<button class="ve-btn ve-btn-default" id="btn-class-prev">← Previous: Species</button>
				<button class="ve-btn ve-btn-primary ml-auto" id="btn-class-next">Next: Choose Background →</button>
			</div>
		</div>`;

        wrpTab.append(wrp);

        this._renderClassSelector(wrp.querySelector("#class-selector"));
        this._renderClassPreview(wrp.querySelector("#class-preview"));
        this._bindNavigation(wrp);
    }

    _renderClassSelector(container) {
        // Filter to 2024 PHB content
        const classes2024 = this._parent.classes.filter(c => c.source === "XPHB" || c.edition === "one");
        const classesToShow = classes2024.length > 0 ? classes2024 : this._parent.classes;

        const wrpSelector = ee`<div class="ve-flex-col"></div>`;

        // Quick filter
        const iptFilter = ee`<input type="text" class="form-control mb-2" placeholder="Filter classes...">`;
        iptFilter.onn("input", () => this._filterClasses(iptFilter.value));
        wrpSelector.append(iptFilter);

        // Class buttons/cards
        const wrpCards = ee`<div class="ve-flex ve-flex-wrap gap-2 charcreator__class-grid" id="class-cards"></div>`;

        classesToShow
            .sort((a, b) => SortUtil.ascSortLower(a.name, b.name))
            .forEach((cls, ix) => {
                const globalIx = this._parent.classes.indexOf(cls);
                const isSelected = this._parent._state.char_ixClass === globalIx;

                const hdFaces = cls.hd?.faces || 8;
                const primaryAbility = this._getPrimaryAbilityStr(cls);

                const card = ee`<button class="ve-btn ${isSelected ? "ve-btn-primary" : "ve-btn-default"} charcreator__class-card" data-ix="${globalIx}">
					<div class="charcreator__class-card-name">${cls.name}</div>
					<div class="charcreator__class-card-info ve-muted ve-small">
						<span title="Hit Die">d${hdFaces}</span>
						${primaryAbility ? `| ${primaryAbility}` : ""}
					</div>
					<div class="charcreator__class-card-source ve-muted ve-small">${Parser.sourceJsonToAbv(cls.source)}</div>
				</button>`;

                card.onn("click", () => this._selectClass(globalIx));
                wrpCards.append(card);
            });

        wrpSelector.append(wrpCards);

        // Open full filter modal button
        const btnOpenFilter = ee`<button class="ve-btn ve-btn-default ve-btn-xs mt-2">
			<span class="glyphicon glyphicon-filter"></span> Advanced Filter
		</button>`;
        btnOpenFilter.onn("click", async () => {
            const selected = await this._parent.modalFilterClasses.pGetUserSelection();
            if (selected?.length) {
                const sel = selected[0];
                const ix = this._parent.classes.findIndex(c => c.name === sel.name && c.source === sel.values.sourceJson);
                if (~ix) this._selectClass(ix);
            }
        });
        wrpSelector.append(btnOpenFilter);

        container.append(wrpSelector);
    }

    _getPrimaryAbilityStr(cls) {
        if (cls.primaryAbility) {
            return cls.primaryAbility.map(ab => {
                return Object.keys(ab).filter(k => ab[k] === true).map(k => k.toUpperCase()).join("/");
            }).join(" or ");
        }
        if (cls.proficiency) {
            return cls.proficiency.map(p => p.toUpperCase()).slice(0, 2).join(", ");
        }
        return "";
    }

    _filterClasses(filter) {
        const cards = document.querySelectorAll(".charcreator__class-card");
        const filterLower = filter.toLowerCase();
        cards.forEach(card => {
            const name = card.querySelector(".charcreator__class-card-name").textContent.toLowerCase();
            card.toggleVe(name.includes(filterLower));
        });
    }

    _selectClass(ix) {
        this._parent._state.char_ixClass = ix;

        // Update button states
        document.querySelectorAll(".charcreator__class-card").forEach(card => {
            const cardIx = Number(card.dataset.ix);
            card.classList.toggle("ve-btn-primary", cardIx === ix);
            card.classList.toggle("ve-btn-default", cardIx !== ix);
        });

        // Calculate initial HP
        this._calculateInitialHP();

        // Update preview
        this._updatePreview();
    }

    _calculateInitialHP() {
        const cls = this._parent.classes[this._parent._state.char_ixClass];
        if (!cls) return;

        const hdFaces = cls.hd?.faces || 8;
        const conMod = this._parent.getAbilityModifier(this._parent._state.char_con || 10);
        const maxHp = hdFaces + conMod;

        this._parent._state.char_hpMax = maxHp;
        this._parent._state.char_hpCurrent = maxHp;
    }

    _renderClassPreview(container) {
        const wrp = ee`<div class="ve-flex-col p-2 charcreator__preview" id="class-preview-content">
			<div class="ve-muted ve-text-center">Select a class to see details</div>
		</div>`;
        container.append(wrp);

        if (this._parent._state.char_ixClass != null) {
            this._updatePreview();
        }

        this._parent._addHookBase("char_ixClass", () => this._updatePreview());
    }

    _updatePreview() {
        const container = document.querySelector("#class-preview-content");
        if (!container) return;

        const ix = this._parent._state.char_ixClass;
        if (ix == null) {
            container.innerHTML = `<div class="ve-muted ve-text-center">Select a class to see details</div>`;
            return;
        }

        const cls = this._parent.classes[ix];
        if (!cls) return;

        const renderer = Renderer.get();

        let html = `<h4 class="mb-2">${cls.name}</h4>`;

        // Hit Die
        if (cls.hd) {
            html += `<div class="mb-1"><strong>Hit Die:</strong> d${cls.hd.faces}</div>`;
        }

        // Primary Ability
        const primaryAbility = this._getPrimaryAbilityStr(cls);
        if (primaryAbility) {
            html += `<div class="mb-1"><strong>Primary Ability:</strong> ${primaryAbility}</div>`;
        }

        // Saving Throw Proficiencies
        if (cls.proficiency) {
            html += `<div class="mb-1"><strong>Saving Throws:</strong> ${cls.proficiency.map(p => Parser.attAbvToFull(p)).join(", ")}</div>`;
        }

        // Armor & Weapon Proficiencies
        if (cls.startingProficiencies) {
            const profs = cls.startingProficiencies;
            if (profs.armor) {
                html += `<div class="mb-1"><strong>Armor:</strong> ${profs.armor.map(a => typeof a === "string" ? a.uppercaseFirst() : a).join(", ")}</div>`;
            }
            if (profs.weapons) {
                html += `<div class="mb-1"><strong>Weapons:</strong> ${profs.weapons.map(w => typeof w === "string" ? w.uppercaseFirst() : w).join(", ")}</div>`;
            }
            if (profs.skills) {
                const skills = profs.skills[0];
                if (skills?.choose) {
                    html += `<div class="mb-1"><strong>Skills:</strong> Choose ${skills.choose.count || 2} from ${skills.choose.from.map(s => s.uppercaseFirst()).join(", ")}</div>`;
                }
            }
        }

        // Starting Equipment
        if (cls.startingEquipment?.entries) {
            html += `<div class="mt-2"><strong>Starting Equipment:</strong></div>`;
            const textStack = [];
            cls.startingEquipment.entries.forEach(entry => {
                renderer.recursiveRender(entry, textStack);
            });
            html += `<div class="charcreator__preview-entries">${textStack.join("")}</div>`;
        }

        // Class Features at Level 1
        if (cls.classFeatures) {
            const level1Features = cls.classFeatures.filter(f => {
                if (typeof f === "string") {
                    const parts = f.split("|");
                    return parts[3] === "1";
                }
                return f.level === 1;
            });

            if (level1Features.length) {
                html += `<div class="mt-2"><strong>Level 1 Features:</strong></div>`;
                html += `<ul class="mb-0">`;
                level1Features.forEach(f => {
                    const name = typeof f === "string" ? f.split("|")[0] : f.name || f.classFeature?.split("|")[0];
                    html += `<li>${name}</li>`;
                });
                html += `</ul>`;
            }
        }

        // Source
        html += `<div class="mt-2 ve-muted ve-small">Source: ${Parser.sourceJsonToFull(cls.source)}</div>`;

        container.innerHTML = html;
        Renderer.dice.bindOnclickListener(container);
    }

    _bindNavigation(wrp) {
        const btnPrev = wrp.querySelector("#btn-class-prev");
        const btnNext = wrp.querySelector("#btn-class-next");

        btnPrev.addEventListener("click", () => {
            this._parent.ixActiveTab = 0;
        });

        btnNext.addEventListener("click", () => {
            if (this._parent._state.char_ixClass == null) {
                JqueryUtil.doToast({ type: "warning", content: "Please select a class first!" });
                return;
            }
            this._parent.ixActiveTab = 2;
        });
    }
}
