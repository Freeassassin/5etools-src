import { VetoolsConfig } from "../utils-config/utils-config-config.js";

export class CharacterSheet extends BaseComponent {
    static _SKILLS = {
        acrobatics: "dex",
        "animal handling": "wis",
        arcana: "int",
        athletics: "str",
        deception: "cha",
        history: "int",
        insight: "wis",
        intimidation: "cha",
        investigation: "int",
        medicine: "wis",
        nature: "int",
        perception: "wis",
        performance: "cha",
        persuasion: "cha",
        religion: "int",
        "sleight of hand": "dex",
        stealth: "dex",
        survival: "wis",
    };

    constructor({ parent }) {
        super();
        this._parent = parent;
    }

    render(wrpTab) {
        const wrp = ee`<div class="ve-flex-col w-100 h-100 p-2 charcreator__sheet overflow-y-auto">
			<div class="ve-flex-v-center mb-3">
				<h3 class="mb-0">Character Sheet</h3>
				<div class="ve-flex-v-center ml-auto gap-2">
					<button class="ve-btn ve-btn-default ve-btn-xs" id="btn-print-sheet" title="Print Character Sheet">
						<span class="glyphicon glyphicon-print"></span> Print
					</button>
					<button class="ve-btn ve-btn-default ve-btn-xs" id="btn-export-sheet" title="Export as JSON">
						<span class="glyphicon glyphicon-download"></span> Export
					</button>
				</div>
			</div>

			<div class="charcreator__sheet-grid">
				<div class="charcreator__sheet-col charcreator__sheet-col--left">
					<div id="sheet-header"></div>
					<div id="sheet-abilities"></div>
					<div id="sheet-saves"></div>
					<div id="sheet-skills"></div>
				</div>

				<div class="charcreator__sheet-col charcreator__sheet-col--middle">
					<div id="sheet-combat"></div>
					<div id="sheet-attacks"></div>
					<div id="sheet-features"></div>
				</div>

				<div class="charcreator__sheet-col charcreator__sheet-col--right">
					<div id="sheet-personality"></div>
					<div id="sheet-equipment"></div>
					<div id="sheet-spells"></div>
				</div>
			</div>

			<div class="ve-flex-v-center mt-3 pt-3 border-top">
				<button class="ve-btn ve-btn-default" id="btn-sheet-edit">← Edit Character</button>
			</div>
		</div>`;

        wrpTab.append(wrp);

        this._renderHeader(wrp.querySelector("#sheet-header"));
        this._renderAbilities(wrp.querySelector("#sheet-abilities"));
        this._renderSavingThrows(wrp.querySelector("#sheet-saves"));
        this._renderSkills(wrp.querySelector("#sheet-skills"));
        this._renderCombat(wrp.querySelector("#sheet-combat"));
        this._renderAttacks(wrp.querySelector("#sheet-attacks"));
        this._renderFeatures(wrp.querySelector("#sheet-features"));
        this._renderPersonality(wrp.querySelector("#sheet-personality"));
        this._renderEquipment(wrp.querySelector("#sheet-equipment"));
        this._renderSpells(wrp.querySelector("#sheet-spells"));

        this._bindActions(wrp);
        this._setupAutoRefresh();
    }

    _setupAutoRefresh() {
        // Refresh sheet when tab becomes active
        this._parent._addHookActiveTab(() => {
            if (this._parent.ixActiveTab === 6) {
                this._refreshAll();
            }
        });
    }

    _refreshAll() {
        const containers = {
            "sheet-header": () => this._updateHeader(),
            "sheet-abilities": () => this._updateAbilities(),
            "sheet-saves": () => this._updateSavingThrows(),
            "sheet-skills": () => this._updateSkills(),
            "sheet-combat": () => this._updateCombat(),
            "sheet-attacks": () => this._updateAttacks(),
            "sheet-features": () => this._updateFeatures(),
            "sheet-personality": () => this._updatePersonality(),
            "sheet-equipment": () => this._updateEquipment(),
        };

        Object.values(containers).forEach(fn => fn());
    }

    _renderHeader(container) {
        const wrp = ee`<div class="charcreator__sheet-section charcreator__sheet-header" id="sheet-header-content"></div>`;
        container.append(wrp);
        this._updateHeader();
    }

    _updateHeader() {
        const container = document.querySelector("#sheet-header-content");
        if (!container) return;

        const species = this._parent.races[this._parent._state.char_ixSpecies];
        const cls = this._parent.classes[this._parent._state.char_ixClass];
        const bg = this._parent.backgrounds[this._parent._state.char_ixBackground];

        const name = this._parent._state.char_name || "Unnamed Character";
        const level = this._parent._state.char_level || 1;
        const speciesName = species?.name || "Unknown Species";
        const className = cls?.name || "Unknown Class";
        const bgName = bg?.name || "Unknown Background";

        container.innerHTML = `
			<div class="charcreator__sheet-name">${name}</div>
			<div class="charcreator__sheet-info">
				Level ${level} ${speciesName} ${className}
			</div>
			<div class="charcreator__sheet-info-secondary">
				Background: ${bgName} | ${this._parent._state.char_alignment || "Unaligned"}
			</div>
		`;
    }

    _renderAbilities(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Ability Scores</h5>
			<div class="charcreator__sheet-abilities" id="sheet-abilities-content"></div>
		</div>`;
        container.append(wrp);
        this._updateAbilities();
    }

    _updateAbilities() {
        const container = document.querySelector("#sheet-abilities-content");
        if (!container) return;

        let html = "";

        Parser.ABIL_ABVS.forEach(ab => {
            const score = this._parent._state[`char_${ab}`] || 10;
            const mod = this._parent.getAbilityModifier(score);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

            html += `
				<div class="charcreator__sheet-ability" data-ab="${ab}">
					<div class="charcreator__sheet-ability-name">${ab.toUpperCase()}</div>
					<div class="charcreator__sheet-ability-score">${score}</div>
					<button class="charcreator__sheet-ability-mod ve-btn ve-btn-default" data-dice="1d20${modStr}" title="Roll ${Parser.attAbvToFull(ab)} Check">
						${modStr}
					</button>
				</div>
			`;
        });

        container.innerHTML = html;

        // Bind dice rollers
        container.querySelectorAll("[data-dice]").forEach(btn => {
            btn.addEventListener("click", (e) => this._rollDice(e, btn.dataset.dice, btn.title));
        });
    }

    _renderSavingThrows(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Saving Throws</h5>
			<div class="charcreator__sheet-saves" id="sheet-saves-content"></div>
		</div>`;
        container.append(wrp);
        this._updateSavingThrows();
    }

    _updateSavingThrows() {
        const container = document.querySelector("#sheet-saves-content");
        if (!container) return;

        const cls = this._parent.classes[this._parent._state.char_ixClass];
        const saveProficiencies = cls?.proficiency || [];
        const profBonus = this._parent.getProficiencyBonus();

        let html = "";

        Parser.ABIL_ABVS.forEach(ab => {
            const score = this._parent._state[`char_${ab}`] || 10;
            const mod = this._parent.getAbilityModifier(score);
            const isProficient = saveProficiencies.includes(ab);
            const totalMod = mod + (isProficient ? profBonus : 0);
            const modStr = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;

            html += `
				<div class="charcreator__sheet-save ${isProficient ? "charcreator__sheet-save--proficient" : ""}" data-ab="${ab}">
					<span class="charcreator__sheet-save-prof">${isProficient ? "●" : "○"}</span>
					<button class="charcreator__sheet-save-roll ve-btn ve-btn-xs ve-btn-default" data-dice="1d20${modStr}" title="Roll ${Parser.attAbvToFull(ab)} Save">
						${modStr}
					</button>
					<span class="charcreator__sheet-save-name">${Parser.attAbvToFull(ab)}</span>
				</div>
			`;
        });

        container.innerHTML = html;

        container.querySelectorAll("[data-dice]").forEach(btn => {
            btn.addEventListener("click", (e) => this._rollDice(e, btn.dataset.dice, btn.title));
        });
    }

    _renderSkills(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Skills</h5>
			<div class="charcreator__sheet-skills" id="sheet-skills-content"></div>
		</div>`;
        container.append(wrp);
        this._updateSkills();
    }

    _updateSkills() {
        const container = document.querySelector("#sheet-skills-content");
        if (!container) return;

        const profBonus = this._parent.getProficiencyBonus();
        const skillProficiencies = this._parent._state.char_proficiencies?.skills || [];

        let html = "";

        Object.entries(CharacterSheet._SKILLS).forEach(([skill, ab]) => {
            const score = this._parent._state[`char_${ab}`] || 10;
            const mod = this._parent.getAbilityModifier(score);
            const isProficient = skillProficiencies.includes(skill);
            const isExpertise = skillProficiencies.filter(s => s === skill).length > 1;
            const totalMod = mod + (isProficient ? profBonus : 0) + (isExpertise ? profBonus : 0);
            const modStr = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;

            html += `
				<div class="charcreator__sheet-skill ${isProficient ? "charcreator__sheet-skill--proficient" : ""}" data-skill="${skill}">
					<span class="charcreator__sheet-skill-prof">${isExpertise ? "◆" : isProficient ? "●" : "○"}</span>
					<button class="charcreator__sheet-skill-roll ve-btn ve-btn-xs ve-btn-default" data-dice="1d20${modStr}" title="Roll ${skill.uppercaseFirst()} (${ab.toUpperCase()})">
						${modStr}
					</button>
					<span class="charcreator__sheet-skill-name">${skill.uppercaseFirst()}</span>
					<span class="charcreator__sheet-skill-ability ve-muted ve-small">(${ab.toUpperCase()})</span>
				</div>
			`;
        });

        container.innerHTML = html;

        container.querySelectorAll("[data-dice]").forEach(btn => {
            btn.addEventListener("click", (e) => this._rollDice(e, btn.dataset.dice, btn.title));
        });
    }

    _renderCombat(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Combat</h5>
			<div class="charcreator__sheet-combat" id="sheet-combat-content"></div>
		</div>`;
        container.append(wrp);
        this._updateCombat();
    }

    _updateCombat() {
        const container = document.querySelector("#sheet-combat-content");
        if (!container) return;

        const cls = this._parent.classes[this._parent._state.char_ixClass];
        const dexMod = this._parent.getAbilityModifier(this._parent._state.char_dex || 10);
        const conMod = this._parent.getAbilityModifier(this._parent._state.char_con || 10);
        const profBonus = this._parent.getProficiencyBonus();

        // Calculate AC from equipped armor
        const inventory = this._parent._state.char_inventory || [];
        const equippedArmor = inventory.find(item => item.armor && item.equipped);
        const equippedShield = inventory.find(item => item.shield && item.equipped);

        let baseAC = 10 + dexMod; // Unarmored
        let acFormula = `10 + DEX (${dexMod})`;

        if (equippedArmor) {
            const armorAC = equippedArmor.ac || 10;
            // Determine armor type and DEX cap
            const armorType = equippedArmor.type?.toLowerCase() || "";
            if (armorType === "la" || armorType === "light") {
                // Light armor: base + full DEX
                baseAC = armorAC + dexMod;
                acFormula = `${equippedArmor.name} (${armorAC}) + DEX (${dexMod})`;
            } else if (armorType === "ma" || armorType === "medium") {
                // Medium armor: base + DEX (max 2)
                const cappedDex = Math.min(dexMod, 2);
                baseAC = armorAC + cappedDex;
                acFormula = `${equippedArmor.name} (${armorAC}) + DEX (${cappedDex}, max 2)`;
            } else if (armorType === "ha" || armorType === "heavy") {
                // Heavy armor: just base
                baseAC = armorAC;
                acFormula = `${equippedArmor.name} (${armorAC})`;
            } else {
                baseAC = armorAC + dexMod;
                acFormula = `${equippedArmor.name} (${armorAC}) + DEX (${dexMod})`;
            }
        }

        if (equippedShield) {
            baseAC += equippedShield.ac || 2;
            acFormula += ` + Shield (+${equippedShield.ac || 2})`;
        }

        // Calculate initiative
        const initiative = dexMod;
        const initStr = initiative >= 0 ? `+${initiative}` : `${initiative}`;

        // Speed (from species)
        const species = this._parent.races[this._parent._state.char_ixSpecies];
        let speed = 30;
        if (species?.speed) {
            speed = typeof species.speed === "number" ? species.speed : (species.speed.walk || 30);
        }

        // Hit Points
        const hpMax = this._parent._state.char_hpMax || 1;
        const hpCurrent = this._parent._state.char_hpCurrent ?? hpMax;
        const hpTemp = this._parent._state.char_hpTemp || 0;

        // Hit Dice
        const hdFaces = cls?.hd?.faces || 8;
        const level = this._parent._state.char_level || 1;

        container.innerHTML = `
			<div class="charcreator__sheet-combat-grid">
				<div class="charcreator__sheet-combat-stat">
					<div class="charcreator__sheet-combat-value">${baseAC}</div>
					<div class="charcreator__sheet-combat-label">Armor Class</div>
				</div>

				<div class="charcreator__sheet-combat-stat">
					<button class="charcreator__sheet-combat-value charcreator__sheet-combat-value--btn ve-btn ve-btn-default"
						data-dice="1d20${initStr}" title="Roll Initiative">
						${initStr}
					</button>
					<div class="charcreator__sheet-combat-label">Initiative</div>
				</div>

				<div class="charcreator__sheet-combat-stat">
					<div class="charcreator__sheet-combat-value">${speed} ft</div>
					<div class="charcreator__sheet-combat-label">Speed</div>
				</div>

				<div class="charcreator__sheet-combat-stat">
					<div class="charcreator__sheet-combat-value">+${profBonus}</div>
					<div class="charcreator__sheet-combat-label">Proficiency</div>
				</div>
			</div>

			<div class="charcreator__sheet-hp mt-3">
				<div class="charcreator__sheet-hp-label">Hit Points</div>
				<div class="charcreator__sheet-hp-box">
					<div class="ve-flex-v-center gap-1">
						<input type="number" class="form-control form-control--minimal charcreator__sheet-hp-input" id="hp-current" value="${hpCurrent}" min="0">
						<span>/</span>
						<input type="number" class="form-control form-control--minimal charcreator__sheet-hp-input" id="hp-max" value="${hpMax}" min="1">
					</div>
					<div class="ve-flex-v-center gap-1 mt-1 ve-small">
						<span>Temp HP:</span>
						<input type="number" class="form-control form-control--minimal charcreator__sheet-hp-input-sm" id="hp-temp" value="${hpTemp}" min="0">
					</div>
				</div>
			</div>

			<div class="charcreator__sheet-hitdice mt-2">
				<div class="ve-flex-v-center">
					<span class="mr-2">Hit Dice:</span>
					<button class="ve-btn ve-btn-default ve-btn-xs" data-dice="${level}d${hdFaces}" title="Roll Hit Dice">
						${level}d${hdFaces}
					</button>
				</div>
			</div>

			<div class="charcreator__sheet-deathsaves mt-2">
				<div class="ve-flex-v-center">
					<span class="mr-2">Death Saves:</span>
					<button class="ve-btn ve-btn-default ve-btn-xs" data-dice="1d20" title="Roll Death Saving Throw">Roll</button>
				</div>
				<div class="ve-flex-v-center mt-1 ve-small">
					<span class="mr-2">Successes:</span>
					<input type="checkbox" class="mr-1"><input type="checkbox" class="mr-1"><input type="checkbox">
					<span class="mx-2">Failures:</span>
					<input type="checkbox" class="mr-1"><input type="checkbox" class="mr-1"><input type="checkbox">
				</div>
			</div>
		`;

        // Bind HP inputs
        container.querySelector("#hp-current").addEventListener("change", (e) => {
            this._parent._state.char_hpCurrent = Math.max(0, Number(e.target.value) || 0);
        });
        container.querySelector("#hp-max").addEventListener("change", (e) => {
            this._parent._state.char_hpMax = Math.max(1, Number(e.target.value) || 1);
        });
        container.querySelector("#hp-temp").addEventListener("change", (e) => {
            this._parent._state.char_hpTemp = Math.max(0, Number(e.target.value) || 0);
        });

        // Bind dice rollers
        container.querySelectorAll("[data-dice]").forEach(btn => {
            btn.addEventListener("click", (e) => this._rollDice(e, btn.dataset.dice, btn.title));
        });
    }

    _renderAttacks(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Attacks & Spellcasting</h5>
			<div class="charcreator__sheet-attacks" id="sheet-attacks-content"></div>
		</div>`;
        container.append(wrp);
        this._updateAttacks();
    }

    _updateAttacks() {
        const container = document.querySelector("#sheet-attacks-content");
        if (!container) return;

        const strMod = this._parent.getAbilityModifier(this._parent._state.char_str || 10);
        const dexMod = this._parent.getAbilityModifier(this._parent._state.char_dex || 10);
        const profBonus = this._parent.getProficiencyBonus();

        // Get equipped weapons from inventory
        const inventory = this._parent._state.char_inventory || [];
        const equippedWeapons = inventory.filter(item => item.weapon && item.equipped);

        let html = "";

        if (equippedWeapons.length) {
            // Render equipped weapons
            equippedWeapons.forEach(weapon => {
                // Determine which ability to use: finesse uses higher of STR/DEX, ranged uses DEX
                let abilityMod = strMod;
                if (weapon.isRanged) {
                    abilityMod = dexMod;
                } else if (weapon.isFinesse) {
                    abilityMod = Math.max(strMod, dexMod);
                }

                const attackBonus = abilityMod + profBonus;
                const attackStr = attackBonus >= 0 ? `+${attackBonus}` : `${attackBonus}`;
                const dmgModStr = abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`;

                const damageDice = weapon.dmg1 || "1d4";
                const damageType = weapon.dmgType ? ` ${Parser.dmgTypeToFull(weapon.dmgType)}` : "";
                const rangeInfo = weapon.range ? ` (${weapon.range})` : "";

                html += `<div class="charcreator__sheet-attack-row">
					<span class="charcreator__sheet-attack-name charcreator__sheet-attack-name--clickable"
						data-attack-dice="1d20${attackStr}"
						data-damage-dice="${damageDice}${dmgModStr}"
						data-attack-name="${weapon.name}"
						title="Click to roll attack and damage">
						${weapon.name}${rangeInfo}
					</span>
					<button class="ve-btn ve-btn-xs ve-btn-default" data-dice="1d20${attackStr}" title="${weapon.name} Attack Roll">${attackStr}</button>
					<span class="ve-muted">to hit</span>
					<button class="ve-btn ve-btn-xs ve-btn-default" data-dice="${damageDice}${dmgModStr}" title="${weapon.name} Damage">${damageDice}${dmgModStr}</button>
					<span class="ve-muted">${damageType || "damage"}</span>
				</div>`;
            });
        } else {
            // Fallback: show generic attack options when no weapons equipped
            const meleeAttack = strMod + profBonus;
            const meleeStr = meleeAttack >= 0 ? `+${meleeAttack}` : `${meleeAttack}`;
            const meleeDmgStr = strMod >= 0 ? `+${strMod}` : `${strMod}`;

            const rangedAttack = dexMod + profBonus;
            const rangedStr = rangedAttack >= 0 ? `+${rangedAttack}` : `${rangedAttack}`;
            const rangedDmgStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;

            html = `
				<div class="charcreator__sheet-attack-row">
					<span class="charcreator__sheet-attack-name charcreator__sheet-attack-name--clickable" data-attack-dice="1d20${meleeStr}" data-damage-dice="1d4${meleeDmgStr}" data-attack-name="Unarmed Strike" title="Click to roll attack and damage">Unarmed Strike</span>
					<button class="ve-btn ve-btn-xs ve-btn-default" data-dice="1d20${meleeStr}" title="Unarmed Attack Roll">${meleeStr}</button>
					<span class="ve-muted">to hit</span>
					<button class="ve-btn ve-btn-xs ve-btn-default" data-dice="1d4${meleeDmgStr}" title="Unarmed Damage">1+${strMod > 0 ? strMod : 0}</button>
					<span class="ve-muted">bludgeoning</span>
				</div>

				<div class="ve-muted ve-small mt-2">
					<span class="glyphicon glyphicon-info-sign mr-1"></span>
					Equip weapons in the Equipment step to show them here.
				</div>
			`;
        }

        html += `
			<div class="mt-2">
				<button class="ve-btn ve-btn-default ve-btn-xs" id="btn-add-attack">+ Add Custom Attack</button>
			</div>

			<div id="custom-attacks" class="mt-2"></div>
		`;

        container.innerHTML = html;

        // Bind dice rollers
        container.querySelectorAll("[data-dice]").forEach(btn => {
            btn.addEventListener("click", (e) => this._rollDice(e, btn.dataset.dice, btn.title));
        });

        // Bind combined attack+damage roll on attack names
        container.querySelectorAll("[data-attack-dice][data-damage-dice]").forEach(el => {
            el.addEventListener("click", (e) => this._rollAttackAndDamage(
                e,
                el.dataset.attackDice,
                el.dataset.damageDice,
                el.dataset.attackName || "Attack",
            ));
        });
    }

    _renderFeatures(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Features & Traits</h5>
			<div class="charcreator__sheet-features" id="sheet-features-content"></div>
		</div>`;
        container.append(wrp);
        this._updateFeatures();
    }

    _updateFeatures() {
        const container = document.querySelector("#sheet-features-content");
        if (!container) return;

        const species = this._parent.races[this._parent._state.char_ixSpecies];
        const cls = this._parent.classes[this._parent._state.char_ixClass];
        const bg = this._parent.backgrounds[this._parent._state.char_ixBackground];

        const renderer = Renderer.get();
        let html = "";

        // Species traits
        if (species?.entries) {
            html += `<div class="charcreator__sheet-feature-group">`;
            html += `<div class="charcreator__sheet-feature-source">${species.name} Traits</div>`;
            species.entries.forEach(entry => {
                if (entry.name) {
                    html += `<div class="charcreator__sheet-feature-name">${entry.name}</div>`;
                }
            });
            html += `</div>`;
        }

        // Class features (level 1)
        if (cls?.classFeatures) {
            const level1Features = cls.classFeatures.filter(f => {
                if (typeof f === "string") {
                    const parts = f.split("|");
                    return parts[3] === "1";
                }
                return false;
            });

            if (level1Features.length) {
                html += `<div class="charcreator__sheet-feature-group">`;
                html += `<div class="charcreator__sheet-feature-source">${cls.name} Features</div>`;
                level1Features.forEach(f => {
                    const name = typeof f === "string" ? f.split("|")[0] : f.name;
                    html += `<div class="charcreator__sheet-feature-name">${name}</div>`;
                });
                html += `</div>`;
            }
        }

        // Background feature
        if (bg?.entries) {
            const feature = bg.entries.find(e => e.name?.includes("Feature"));
            if (feature) {
                html += `<div class="charcreator__sheet-feature-group">`;
                html += `<div class="charcreator__sheet-feature-source">${bg.name}</div>`;
                html += `<div class="charcreator__sheet-feature-name">${feature.name}</div>`;
                html += `</div>`;
            }

            // Background feat (2024)
            if (bg.feats) {
                const featKey = Object.keys(bg.feats[0] || {}).find(k => bg.feats[0][k] === true);
                if (featKey) {
                    html += `<div class="charcreator__sheet-feature-name">Feat: ${featKey.split("|")[0].uppercaseFirst()}</div>`;
                }
            }
        }

        if (!html) {
            html = `<div class="ve-muted">Complete character creation to see features</div>`;
        }

        container.innerHTML = html;
        Renderer.dice.bindOnclickListener(container);
    }

    _renderPersonality(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Personality</h5>
			<div class="charcreator__sheet-personality" id="sheet-personality-content"></div>
		</div>`;
        container.append(wrp);
        this._updatePersonality();
    }

    _updatePersonality() {
        const container = document.querySelector("#sheet-personality-content");
        if (!container) return;

        const traits = [
            { label: "Personality Traits", value: this._parent._state.char_personality },
            { label: "Ideals", value: this._parent._state.char_ideals },
            { label: "Bonds", value: this._parent._state.char_bonds },
            { label: "Flaws", value: this._parent._state.char_flaws },
        ];

        let html = "";
        traits.forEach(t => {
            html += `
				<div class="charcreator__sheet-personality-item">
					<div class="charcreator__sheet-personality-label">${t.label}</div>
					<div class="charcreator__sheet-personality-value">${t.value || "—"}</div>
				</div>
			`;
        });

        // Physical characteristics
        const physical = [
            { label: "Age", value: this._parent._state.char_age },
            { label: "Height", value: this._parent._state.char_height },
            { label: "Weight", value: this._parent._state.char_weight },
            { label: "Eyes", value: this._parent._state.char_eyes },
            { label: "Skin", value: this._parent._state.char_skin },
            { label: "Hair", value: this._parent._state.char_hair },
        ].filter(p => p.value);

        if (physical.length) {
            html += `<div class="charcreator__sheet-physical mt-2">`;
            physical.forEach(p => {
                html += `<span class="ve-small"><strong>${p.label}:</strong> ${p.value}</span> `;
            });
            html += `</div>`;
        }

        container.innerHTML = html;
    }

    _renderEquipment(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Equipment & Inventory</h5>
			<div class="charcreator__sheet-equipment" id="sheet-equipment-content"></div>
		</div>`;
        container.append(wrp);
        this._updateEquipment();
    }

    _updateEquipment() {
        const container = document.querySelector("#sheet-equipment-content");
        if (!container) return;

        const gold = this._parent._state.char_gold || 0;
        const inventory = this._parent._state.char_inventory || [];

        let html = `<div class="charcreator__sheet-gold mb-2">
			<strong>Gold:</strong>
			<input type="number" class="form-control form-control--minimal charcreator__sheet-gold-input" id="sheet-gold" value="${gold}" min="0"> gp
		</div>`;

        if (inventory.length) {
            html += `<ul class="charcreator__sheet-inventory-list mb-0">`;
            inventory.forEach((item, ix) => {
                html += `<li class="ve-flex-v-center">
					<span class="ve-flex-grow">${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.name}</span>
					<button class="ve-btn ve-btn-danger ve-btn-xxs" data-remove-ix="${ix}">×</button>
				</li>`;
            });
            html += `</ul>`;
        } else {
            html += `<div class="ve-muted ve-small">No items in inventory</div>`;
        }

        // Add item controls
        html += `
			<div class="ve-flex-v-center mt-2 gap-1">
				<input type="text" class="form-control form-control--minimal ve-flex-grow" id="sheet-add-item" placeholder="Add item...">
				<button class="ve-btn ve-btn-primary ve-btn-xs" id="sheet-btn-add-item">+</button>
			</div>
		`;

        container.innerHTML = html;

        // Bind gold input
        container.querySelector("#sheet-gold").addEventListener("change", (e) => {
            this._parent._state.char_gold = Math.max(0, Number(e.target.value) || 0);
        });

        // Bind remove buttons
        container.querySelectorAll("[data-remove-ix]").forEach(btn => {
            btn.addEventListener("click", () => {
                const ix = Number(btn.dataset.removeIx);
                const newInventory = [...this._parent._state.char_inventory];
                newInventory.splice(ix, 1);
                this._parent._state.char_inventory = newInventory;
                this._updateEquipment();
            });
        });

        // Bind add item
        const btnAdd = container.querySelector("#sheet-btn-add-item");
        const iptAdd = container.querySelector("#sheet-add-item");
        btnAdd.addEventListener("click", () => {
            const name = iptAdd.value.trim();
            if (!name) return;
            const inventory = [...(this._parent._state.char_inventory || [])];
            inventory.push({ name, quantity: 1 });
            this._parent._state.char_inventory = inventory;
            iptAdd.value = "";
            this._updateEquipment();
        });
        iptAdd.addEventListener("keydown", (e) => {
            if (e.key === "Enter") btnAdd.click();
        });
    }

    _renderSpells(container) {
        const wrp = ee`<div class="charcreator__sheet-section">
			<h5 class="charcreator__sheet-section-title">Spellcasting</h5>
			<div class="charcreator__sheet-spells" id="sheet-spells-content"></div>
		</div>`;
        container.append(wrp);
        this._updateSpells();
    }

    _updateSpells() {
        const container = document.querySelector("#sheet-spells-content");
        if (!container) return;

        const cls = this._parent.classes[this._parent._state.char_ixClass];

        // Check if class is a spellcaster (simplified check)
        const spellcastingAbility = this._getSpellcastingAbility(cls);

        if (!spellcastingAbility) {
            container.innerHTML = `<div class="ve-muted">This class doesn't have spellcasting at level 1</div>`;
            return;
        }

        const abilityMod = this._parent.getAbilityModifier(this._parent._state[`char_${spellcastingAbility}`] || 10);
        const profBonus = this._parent.getProficiencyBonus();
        const spellSaveDC = 8 + profBonus + abilityMod;
        const spellAttack = profBonus + abilityMod;
        const spellAttackStr = spellAttack >= 0 ? `+${spellAttack}` : `${spellAttack}`;

        container.innerHTML = `
			<div class="charcreator__sheet-spell-stats">
				<div class="charcreator__sheet-spell-stat">
					<div class="charcreator__sheet-spell-stat-label">Spellcasting Ability</div>
					<div class="charcreator__sheet-spell-stat-value">${spellcastingAbility.toUpperCase()}</div>
				</div>
				<div class="charcreator__sheet-spell-stat">
					<div class="charcreator__sheet-spell-stat-label">Spell Save DC</div>
					<div class="charcreator__sheet-spell-stat-value">${spellSaveDC}</div>
				</div>
				<div class="charcreator__sheet-spell-stat">
					<div class="charcreator__sheet-spell-stat-label">Spell Attack</div>
					<button class="ve-btn ve-btn-default ve-btn-xs" data-dice="1d20${spellAttackStr}" title="Spell Attack Roll">${spellAttackStr}</button>
				</div>
			</div>

			<div class="mt-2 ve-muted ve-small">
				Spell selection coming soon! For now, refer to your class spell list.
			</div>
		`;

        container.querySelectorAll("[data-dice]").forEach(btn => {
            btn.addEventListener("click", (e) => this._rollDice(e, btn.dataset.dice, btn.title));
        });
    }

    _getSpellcastingAbility(cls) {
        if (!cls) return null;

        // Map class names to spellcasting abilities
        const spellcastingMap = {
            "Bard": "cha",
            "Cleric": "wis",
            "Druid": "wis",
            "Paladin": "cha",
            "Ranger": "wis",
            "Sorcerer": "cha",
            "Warlock": "cha",
            "Wizard": "int",
            "Artificer": "int",
        };

        return spellcastingMap[cls.name] || null;
    }

    async _rollDice(evt, diceStr, title) {
        evt.preventDefault();
        evt.stopPropagation();

        // Use pRollEntry which is the standard dice rolling API
        const entry = { toRoll: diceStr };
        const rolledBy = {
            name: this._parent.getCharacter()?.name || "Character",
            label: title || "Roll",
        };
        await Renderer.dice.pRollEntry(entry, rolledBy);
    }

    async _rollAttackAndDamage(evt, attackDice, damageDice, attackName) {
        evt.preventDefault();
        evt.stopPropagation();

        const characterName = this._parent.getCharacter()?.name || "Character";

        // Roll attack
        const attackEntry = { toRoll: attackDice };
        const attackRolledBy = {
            name: characterName,
            label: `${attackName} (Attack)`,
        };
        await Renderer.dice.pRollEntry(attackEntry, attackRolledBy);

        // Roll damage
        const damageEntry = { toRoll: damageDice };
        const damageRolledBy = {
            name: characterName,
            label: `${attackName} (Damage)`,
        };
        await Renderer.dice.pRollEntry(damageEntry, damageRolledBy);
    }

    _bindActions(wrp) {
        // Print button
        wrp.querySelector("#btn-print-sheet").addEventListener("click", () => {
            window.print();
        });

        // Export button
        wrp.querySelector("#btn-export-sheet").addEventListener("click", () => {
            const character = this._parent.getCharacter();
            DataUtil.userDownload(`${character.name || "character"}`, this._parent.getSaveableState(), { fileType: "character" });
        });

        // Edit button
        wrp.querySelector("#btn-sheet-edit").addEventListener("click", () => {
            this._parent.ixActiveTab = 0;
        });
    }
}
