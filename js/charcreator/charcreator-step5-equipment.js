import { VetoolsConfig } from "../utils-config/utils-config-config.js";

export class CharacterCreatorStep5Equipment extends BaseComponent {
    constructor({ parent }) {
        super();
        this._parent = parent;
    }

    render(wrpTab) {
        const wrp = ee`<div class="ve-flex-col w-100 h-100 p-2 charcreator__step charcreator__step-equipment">
			<h3 class="mb-3">Choose Starting Equipment</h3>
			<p class="mb-3">Your class and background provide starting equipment. You can also add items from the database or create custom items.</p>

			<div class="ve-flex-col mb-3" id="equipment-class"></div>
			<div class="ve-flex-col mb-3" id="equipment-background"></div>

			<div class="ve-flex-col mb-3" id="equipment-inventory">
				<h4 class="mb-2">Inventory</h4>
				<div class="ve-flex-v-center mb-2 gap-2">
					<button class="ve-btn ve-btn-primary ve-btn-sm" id="btn-add-item-db">
						<span class="glyphicon glyphicon-search mr-1"></span>Add from Database
					</button>
					<button class="ve-btn ve-btn-default ve-btn-sm" id="btn-add-item-custom">
						<span class="glyphicon glyphicon-plus mr-1"></span>Add Custom Item
					</button>
				</div>

				<div class="ve-flex-v-center mb-2">
					<label class="mr-2">Gold:</label>
					<input type="number" class="form-control form-control--minimal w-100p" id="char-gold" value="0" min="0">
					<span class="ml-1">gp</span>
				</div>

				<div class="charcreator__inventory-list" id="inventory-content"></div>
			</div>

			<div class="ve-flex-v-center mt-auto pt-3">
				<button class="ve-btn ve-btn-default" id="btn-eq-prev">← Previous: Ability Scores</button>
				<button class="ve-btn ve-btn-primary ml-auto" id="btn-eq-next">Next: Character Details →</button>
			</div>
		</div>`;

        wrpTab.append(wrp);

        this._renderClassEquipment(wrp.querySelector("#equipment-class"));
        this._renderBackgroundEquipment(wrp.querySelector("#equipment-background"));
        this._bindInventoryControls(wrp);
        this._bindNavigation(wrp);
        this._updateInventoryList();

        this._parent._addHookBase("char_inventory", () => this._updateInventoryList());
    }

    _renderClassEquipment(container) {
        const wrp = ee`<div class="ve-flex-col charcreator__equipment-section">
			<h4 class="mb-2">Class Equipment</h4>
			<div id="class-equipment-content"></div>
		</div>`;
        container.append(wrp);

        this._updateClassEquipment();
        this._parent._addHookBase("char_ixClass", () => this._updateClassEquipment());
    }

    _updateClassEquipment() {
        const container = document.querySelector("#class-equipment-content");
        if (!container) return;

        const cls = this._parent.classes[this._parent._state.char_ixClass];
        if (!cls) {
            container.innerHTML = `<div class="ve-muted">Select a class first</div>`;
            return;
        }

        const renderer = Renderer.get();
        let html = "";

        if (cls.startingEquipment) {
            if (cls.startingEquipment.entries) {
                const textStack = [];
                cls.startingEquipment.entries.forEach(entry => {
                    renderer.recursiveRender(entry, textStack);
                });
                html += `<div class="charcreator__equipment-list">${textStack.join("")}</div>`;
            } else if (cls.startingEquipment.defaultData) {
                html += this._formatEquipmentChoices(cls.startingEquipment.defaultData);
            }

            // Gold alternative
            if (cls.startingEquipment.goldAlternative) {
                html += `<div class="mt-2 ve-flex-v-center">
					<label class="ve-flex-v-center">
						<input type="checkbox" class="mr-2" id="class-gold-alt">
						<span>Take gold instead: ${cls.startingEquipment.goldAlternative}</span>
					</label>
				</div>`;
            }
        } else {
            html = `<div class="ve-muted">No starting equipment defined</div>`;
        }

        container.innerHTML = html;
        Renderer.dice.bindOnclickListener(container);

        // Bind gold alternative checkbox
        const cbGoldAlt = container.querySelector("#class-gold-alt");
        if (cbGoldAlt) {
            cbGoldAlt.addEventListener("change", () => {
                this._parent._state.char_useClassGold = cbGoldAlt.checked;
            });
        }
    }

    _formatEquipmentChoices(defaultData) {
        if (!defaultData?.length) return "";

        let html = `<div class="charcreator__equipment-choices">`;

        defaultData.forEach((choiceSet, setIx) => {
            const options = Object.entries(choiceSet);

            if (options.length > 1) {
                html += `<div class="charcreator__equipment-choice mb-2">`;
                html += `<div class="mb-1"><strong>Choice ${setIx + 1}:</strong></div>`;

                options.forEach(([optKey, items], optIx) => {
                    const optionId = `eq-choice-${setIx}-${optKey}`;
                    const isFirst = optIx === 0;

                    html += `<label class="ve-flex-v-start mb-1">
						<input type="radio" name="eq-choice-${setIx}" value="${optKey}" class="mr-2 mt-1" ${isFirst ? "checked" : ""}>
						<span>${this._formatEquipmentList(items)}</span>
					</label>`;
                });

                html += `</div>`;
            } else {
                // Single item set
                const [key, items] = options[0];
                html += `<div class="mb-1">${this._formatEquipmentList(items)}</div>`;
            }
        });

        html += `</div>`;
        return html;
    }

    _formatEquipmentList(items) {
        if (!items?.length) return "";

        return items.map(item => {
            if (typeof item === "string") return item;
            if (item.item) {
                const qty = item.quantity ? `${item.quantity}× ` : "";
                const name = item.item.split("|")[0];
                return `${qty}${name.uppercaseFirst()}`;
            }
            if (item.value) {
                return `${item.value / 100} gp`;
            }
            if (item.equipmentType) {
                const qty = item.quantity ? `${item.quantity}× ` : "";
                return `${qty}${item.equipmentType}`;
            }
            return "";
        }).filter(Boolean).join(", ");
    }

    _renderBackgroundEquipment(container) {
        const wrp = ee`<div class="ve-flex-col charcreator__equipment-section">
			<h4 class="mb-2">Background Equipment</h4>
			<div id="background-equipment-content"></div>
		</div>`;
        container.append(wrp);

        this._updateBackgroundEquipment();
        this._parent._addHookBase("char_ixBackground", () => this._updateBackgroundEquipment());
    }

    _updateBackgroundEquipment() {
        const container = document.querySelector("#background-equipment-content");
        if (!container) return;

        const bg = this._parent.backgrounds[this._parent._state.char_ixBackground];
        if (!bg) {
            container.innerHTML = `<div class="ve-muted">Select a background first</div>`;
            return;
        }

        let html = "";

        if (bg.startingEquipment) {
            html += this._formatEquipmentChoices(bg.startingEquipment);
        } else {
            // Look for equipment in entries
            const equipmentEntry = bg.entries?.find(e => e.name === "Equipment" || (e.type === "list" && e.items?.some(i => i.name === "Equipment:")));
            if (equipmentEntry) {
                const renderer = Renderer.get();
                const textStack = [];
                renderer.recursiveRender(equipmentEntry, textStack);
                html = textStack.join("");
            } else {
                html = `<div class="ve-muted">No starting equipment defined</div>`;
            }
        }

        container.innerHTML = html;
        Renderer.dice.bindOnclickListener(container);
    }

    _bindInventoryControls(wrp) {
        // Gold input
        const iptGold = wrp.querySelector("#char-gold");
        iptGold.value = this._parent._state.char_gold || 0;
        iptGold.addEventListener("change", () => {
            this._parent._state.char_gold = Number(iptGold.value) || 0;
        });

        // Add from database button
        const btnAddDb = wrp.querySelector("#btn-add-item-db");
        btnAddDb.addEventListener("click", () => this._pOpenItemPicker());

        // Add custom item button
        const btnAddCustom = wrp.querySelector("#btn-add-item-custom");
        btnAddCustom.addEventListener("click", () => this._pAddCustomItem());
    }

    async _pOpenItemPicker() {
        const modalFilter = this._parent.modalFilterItems;

        const selected = await modalFilter.pGetUserSelection();
        if (!selected || !selected.length) return;

        const inventory = [...(this._parent._state.char_inventory || [])];

        for (const sel of selected) {
            const item = this._parent.items.find(it =>
                it.name === sel.name && it.source === sel.values.sourceJson,
            );

            if (!item) continue;

            // Check if already in inventory
            const existing = inventory.find(inv =>
                inv.name === item.name && inv.source === item.source,
            );

            if (existing) {
                existing.quantity = (existing.quantity || 1) + 1;
            } else {
                inventory.push(this._createInventoryItem(item));
            }
        }

        this._parent._state.char_inventory = inventory;
    }

    _createInventoryItem(item) {
        const invItem = {
            name: item.name,
            source: item.source,
            quantity: 1,
            equipped: false,
            isFromDatabase: true,
        };

        // Copy weapon properties
        if (item.weapon) {
            invItem.weapon = true;
            invItem.dmg1 = item.dmg1;
            invItem.dmg2 = item.dmg2;
            invItem.dmgType = item.dmgType;
            invItem.property = item.property;
            invItem.range = item.range;
            invItem.weaponCategory = item.weaponCategory;

            // Determine if finesse or ranged
            const properties = item.property || [];
            invItem.isFinesse = properties.some(p => p.toLowerCase().includes("f"));
            invItem.isRanged = item.type === "R" || !!item.range;
        }

        // Copy armor properties
        if (item.armor) {
            invItem.armor = true;
            invItem.ac = item.ac;
            invItem.type = item.type;
            invItem.strength = item.strength;
            invItem.stealth = item.stealth;
        }

        // Copy shield properties
        if (item.type === "S") {
            invItem.shield = true;
            invItem.ac = item.ac || 2;
        }

        return invItem;
    }

    async _pAddCustomItem() {
        const name = await InputUiUtil.pGetUserString({
            title: "Add Custom Item",
            htmlDescription: "Enter the item name:",
        });

        if (!name) return;

        const inventory = [...(this._parent._state.char_inventory || [])];
        inventory.push({
            name,
            quantity: 1,
            equipped: false,
            isFromDatabase: false,
        });

        this._parent._state.char_inventory = inventory;
    }

    _updateInventoryList() {
        const container = document.querySelector("#inventory-content");
        if (!container) return;

        const inventory = this._parent._state.char_inventory || [];

        if (!inventory.length) {
            container.innerHTML = `<div class="ve-muted ve-small">No items in inventory. Add items from the database or create custom items.</div>`;
            return;
        }

        // Group by category
        const weapons = inventory.filter(it => it.weapon);
        const armor = inventory.filter(it => it.armor || it.shield);
        const other = inventory.filter(it => !it.weapon && !it.armor && !it.shield);

        let html = "";

        if (weapons.length) {
            html += `<div class="charcreator__inv-category">
				<div class="charcreator__inv-category-header">Weapons</div>
				${this._renderInventoryItems(weapons, "weapon")}
			</div>`;
        }

        if (armor.length) {
            html += `<div class="charcreator__inv-category">
				<div class="charcreator__inv-category-header">Armor & Shields</div>
				${this._renderInventoryItems(armor, "armor")}
			</div>`;
        }

        if (other.length) {
            html += `<div class="charcreator__inv-category">
				<div class="charcreator__inv-category-header">Other Items</div>
				${this._renderInventoryItems(other, "other")}
			</div>`;
        }

        container.innerHTML = html;

        // Bind equip toggles
        container.querySelectorAll(".charcreator__inv-equip-cb").forEach(cb => {
            cb.addEventListener("change", () => {
                const ix = Number(cb.dataset.ix);
                const inventory = [...this._parent._state.char_inventory];
                const item = inventory[ix];

                // For armor, unequip other armor of same type
                if (item.armor && cb.checked) {
                    inventory.forEach((inv, i) => {
                        if (i !== ix && inv.armor && inv.equipped) {
                            inv.equipped = false;
                        }
                    });
                }

                item.equipped = cb.checked;
                this._parent._state.char_inventory = inventory;
            });
        });

        // Bind quantity changes
        container.querySelectorAll(".charcreator__inv-qty").forEach(ipt => {
            ipt.addEventListener("change", () => {
                const ix = Number(ipt.dataset.ix);
                const inventory = [...this._parent._state.char_inventory];
                inventory[ix].quantity = Math.max(1, Number(ipt.value) || 1);
                this._parent._state.char_inventory = inventory;
            });
        });

        // Bind remove buttons
        container.querySelectorAll(".charcreator__inv-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const ix = Number(btn.dataset.ix);
                const inventory = [...this._parent._state.char_inventory];
                inventory.splice(ix, 1);
                this._parent._state.char_inventory = inventory;
            });
        });
    }

    _renderInventoryItems(items, category) {
        const fullInventory = this._parent._state.char_inventory || [];

        return items.map(item => {
            const ix = fullInventory.indexOf(item);
            const canEquip = category === "weapon" || category === "armor";

            let details = "";
            if (item.weapon && item.dmg1) {
                const dmgType = item.dmgType ? Parser.dmgTypeToFull(item.dmgType) : "";
                details = `${item.dmg1}${dmgType ? ` ${dmgType}` : ""}`;
                if (item.range) details += ` (${item.range})`;
            } else if (item.armor && item.ac) {
                details = `AC ${item.ac}`;
            } else if (item.shield) {
                details = `+${item.ac || 2} AC`;
            }

            return `<div class="charcreator__inv-item ve-flex-v-center">
				${canEquip ? `
					<input type="checkbox" class="charcreator__inv-equip-cb mr-2" data-ix="${ix}" ${item.equipped ? "checked" : ""} title="Equip">
				` : `<span class="mr-2" style="width:16px"></span>`}
				<span class="charcreator__inv-item-name ve-flex-grow ${item.equipped ? "charcreator__inv-item-name--equipped" : ""}">
					${item.name}
					${item.isFromDatabase ? `<span class="ve-muted ve-small">(${Parser.sourceJsonToAbv(item.source)})</span>` : ""}
				</span>
				<span class="charcreator__inv-item-details ve-muted ve-small mr-2">${details}</span>
				<input type="number" class="form-control form-control--minimal charcreator__inv-qty" data-ix="${ix}" value="${item.quantity || 1}" min="1" style="width:50px">
				<button class="ve-btn ve-btn-danger ve-btn-xxs ml-1 charcreator__inv-remove" data-ix="${ix}" title="Remove">×</button>
			</div>`;
        }).join("");
    }

    _bindNavigation(wrp) {
        const btnPrev = wrp.querySelector("#btn-eq-prev");
        const btnNext = wrp.querySelector("#btn-eq-next");

        btnPrev.addEventListener("click", () => {
            this._parent.ixActiveTab = 3;
        });

        btnNext.addEventListener("click", () => {
            this._parent.ixActiveTab = 5;
        });
    }
}
