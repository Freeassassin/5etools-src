import { CharacterCreatorStep1Species } from "./charcreator-step1-species.js";
import { CharacterCreatorStep2Class } from "./charcreator-step2-class.js";
import { CharacterCreatorStep3Background } from "./charcreator-step3-background.js";
import { CharacterCreatorStep4Stats } from "./charcreator-step4-stats.js";
import { CharacterCreatorStep5Equipment } from "./charcreator-step5-equipment.js";
import { CharacterCreatorStep6Details } from "./charcreator-step6-details.js";
import { CharacterSheet } from "./charcreator-sheet.js";
import { VetoolsConfig } from "../utils-config/utils-config-config.js";
import { SITE_STYLE__ONE } from "../consts.js";

const { ModalFilterItems } = globalThis;

export class CharacterCreatorUi extends BaseComponent {
    static _TABS = [
        "species",
        "class",
        "background",
        "stats",
        "equipment",
        "details",
        "sheet",
    ];

    static _TAB_NAMES = {
        "species": "Species",
        "class": "Class",
        "background": "Background",
        "stats": "Ability Scores",
        "equipment": "Equipment",
        "details": "Details",
        "sheet": "Character Sheet",
    };

    /**
     * @param opts
     * @param opts.races
     * @param opts.backgrounds
     * @param opts.feats
     * @param opts.classes
     * @param opts.spells
     * @param opts.items
     * @param [opts.tabMetasAdditional]
     */
    constructor(opts) {
        super();
        opts = opts || {};

        TabUiUtilSide.decorate(this, { isInitMeta: true });

        this._races = opts.races;
        this._backgrounds = opts.backgrounds;
        this._feats = opts.feats;
        this._classes = opts.classes;
        this._spells = opts.spells;
        this._items = opts.items;
        this._tabMetasAdditional = opts.tabMetasAdditional;

        this._modalFilterRaces = new ModalFilterRaces({ namespace: "charcreator.races", isRadio: true, allData: this._races });
        this._modalFilterBackgrounds = new ModalFilterBackgrounds({ namespace: "charcreator.backgrounds", isRadio: true, allData: this._backgrounds });
        this._modalFilterFeats = new ModalFilterFeats({ namespace: "charcreator.feats", isRadio: true, allData: this._feats });
        this._modalFilterItems = new ModalFilterItems({ namespace: "charcreator.items", allData: this._items });

        // Step components
        this._stepSpecies = null;
        this._stepClass = null;
        this._stepBackground = null;
        this._stepStats = null;
        this._stepEquipment = null;
        this._stepDetails = null;
        this._sheet = null;
    }

    get TABS() { return CharacterCreatorUi._TABS; }

    get ixActiveTab() { return this._getIxActiveTab(); }
    set ixActiveTab(ix) { this._setIxActiveTab({ ixActiveTab: ix }); }

    // region Public API
    get races() { return this._races; }
    get backgrounds() { return this._backgrounds; }
    get feats() { return this._feats; }
    get classes() { return this._classes; }
    get spells() { return this._spells; }
    get items() { return this._items; }

    get modalFilterRaces() { return this._modalFilterRaces; }
    get modalFilterBackgrounds() { return this._modalFilterBackgrounds; }
    get modalFilterFeats() { return this._modalFilterFeats; }
    get modalFilterItems() { return this._modalFilterItems; }

    addHookActiveTag(hook) { this._addHookActiveTab(hook); }
    addHookAll(hookProp, hook) { this._addHookAll(hookProp, hook); }

    getCharacter() {
        return {
            name: this._state.char_name || "Unnamed Character",
            species: this._races[this._state.char_ixSpecies],
            class: this._classes[this._state.char_ixClass],
            subclass: this._state.char_ixSubclass != null ? this._getSubclasses()[this._state.char_ixSubclass] : null,
            background: this._backgrounds[this._state.char_ixBackground],
            level: this._state.char_level || 1,
            abilityScores: {
                str: this._state.char_str || 10,
                dex: this._state.char_dex || 10,
                con: this._state.char_con || 10,
                int: this._state.char_int || 10,
                wis: this._state.char_wis || 10,
                cha: this._state.char_cha || 10,
            },
            hitPoints: {
                current: this._state.char_hpCurrent,
                max: this._state.char_hpMax,
                temp: this._state.char_hpTemp || 0,
            },
            inventory: this._state.char_inventory || [],
            equipment: this._state.char_equipment || [],
            spells: this._state.char_spells || [],
            proficiencies: this._state.char_proficiencies || {},
            features: this._state.char_features || [],
            personality: this._state.char_personality || "",
            ideals: this._state.char_ideals || "",
            bonds: this._state.char_bonds || "",
            flaws: this._state.char_flaws || "",
            backstory: this._state.char_backstory || "",
            alignment: this._state.char_alignment || "",
            age: this._state.char_age || "",
            height: this._state.char_height || "",
            weight: this._state.char_weight || "",
            eyes: this._state.char_eyes || "",
            skin: this._state.char_skin || "",
            hair: this._state.char_hair || "",
        };
    }

    _getSubclasses() {
        const cls = this._classes[this._state.char_ixClass];
        if (!cls) return [];
        // Subclasses are typically loaded separately - return empty for now
        return [];
    }

    getProficiencyBonus() {
        const level = this._state.char_level || 1;
        return Math.floor((level - 1) / 4) + 2;
    }

    getAbilityModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    getSaveableState() {
        return {
            state: MiscUtil.copyFast(this.__state),
            meta: {
                ixActiveTab: this.ixActiveTab,
            },
        };
    }

    setStateFrom(saved, isOverwrite = false) {
        if (saved?.state) {
            if (isOverwrite) {
                this._proxyAssignSimple("state", saved.state, true);
            } else {
                Object.assign(this._state, saved.state);
            }
        }
        if (saved?.meta?.ixActiveTab != null) {
            this.ixActiveTab = saved.meta.ixActiveTab;
        }
    }

    doResetAll() {
        this._proxyAssignSimple("state", this._getDefaultState(), true);
    }
    // endregion

    async pInit() {
        await this._modalFilterRaces.pPopulateHiddenWrapper();
        await this._modalFilterBackgrounds.pPopulateHiddenWrapper();
        await this._modalFilterFeats.pPopulateHiddenWrapper();
    }

    render(parent) {
        parent.empty().addClass("charcreator");

        const iptTabMetas = CharacterCreatorUi._TABS.map(tab => {
            return new TabUiUtil.TabMeta({
                name: CharacterCreatorUi._TAB_NAMES[tab],
                hasBorder: true,
            });
        });

        if (this._tabMetasAdditional) {
            iptTabMetas.push(...this._tabMetasAdditional);
        }

        const tabMetas = this._renderTabs(iptTabMetas, { eleParent: parent });

        // Render each step
        this._renderStepSpecies(tabMetas[0].wrpTab);
        this._renderStepClass(tabMetas[1].wrpTab);
        this._renderStepBackground(tabMetas[2].wrpTab);
        this._renderStepStats(tabMetas[3].wrpTab);
        this._renderStepEquipment(tabMetas[4].wrpTab);
        this._renderStepDetails(tabMetas[5].wrpTab);
        this._renderSheet(tabMetas[6].wrpTab);

        // Navigation buttons
        const hkNav = () => {
            tabMetas.forEach((meta, ix) => {
                if (ix < CharacterCreatorUi._TABS.length) {
                    meta.wrpTab.toggleVe(this.ixActiveTab === ix);
                }
            });
        };
        this._addHookActiveTab(hkNav);
        hkNav();
    }

    _renderStepSpecies(wrpTab) {
        this._stepSpecies = new CharacterCreatorStep1Species({ parent: this });
        this._stepSpecies.render(wrpTab);
    }

    _renderStepClass(wrpTab) {
        this._stepClass = new CharacterCreatorStep2Class({ parent: this });
        this._stepClass.render(wrpTab);
    }

    _renderStepBackground(wrpTab) {
        this._stepBackground = new CharacterCreatorStep3Background({ parent: this });
        this._stepBackground.render(wrpTab);
    }

    _renderStepStats(wrpTab) {
        this._stepStats = new CharacterCreatorStep4Stats({ parent: this });
        this._stepStats.render(wrpTab);
    }

    _renderStepEquipment(wrpTab) {
        this._stepEquipment = new CharacterCreatorStep5Equipment({ parent: this });
        this._stepEquipment.render(wrpTab);
    }

    _renderStepDetails(wrpTab) {
        this._stepDetails = new CharacterCreatorStep6Details({ parent: this });
        this._stepDetails.render(wrpTab);
    }

    _renderSheet(wrpTab) {
        this._sheet = new CharacterSheet({ parent: this });
        this._sheet.render(wrpTab);
    }

    _getDefaultState() {
        return {
            // Character basics
            char_name: "",
            char_level: 1,
            char_ixSpecies: null,
            char_ixClass: null,
            char_ixSubclass: null,
            char_ixBackground: null,

            // Ability scores
            char_str: 10,
            char_dex: 10,
            char_con: 10,
            char_int: 10,
            char_wis: 10,
            char_cha: 10,

            // Ability score generation method
            char_statMethod: "pointbuy", // "rolled", "array", "pointbuy", "manual"
            char_rolledStats: [],
            char_pbPoints: 27,

            // HP
            char_hpMax: null,
            char_hpCurrent: null,
            char_hpTemp: 0,

            // Inventory & Equipment
            char_inventory: [],
            char_equipment: [],
            char_gold: 0,

            // Spells
            char_spells: [],
            char_spellSlots: {},

            // Proficiencies
            char_proficiencies: {
                armor: [],
                weapons: [],
                tools: [],
                savingThrows: [],
                skills: [],
                languages: [],
            },

            // Features
            char_features: [],

            // Character details
            char_alignment: "",
            char_personality: "",
            char_ideals: "",
            char_bonds: "",
            char_flaws: "",
            char_backstory: "",
            char_age: "",
            char_height: "",
            char_weight: "",
            char_eyes: "",
            char_skin: "",
            char_hair: "",
        };
    }
}
