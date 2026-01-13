import { CharacterCreatorUi } from "./charcreator/charcreator-ui.js";
import { VetoolsConfig } from "./utils-config/utils-config-config.js";
import { UtilsEntityBackground } from "./utils/utils-entity-background.js";
import { UtilsEntityRace } from "./utils/utils-entity-race.js";

class CharacterCreatorPage {
    static _STORAGE_KEY_STATE = "characterCreatorState";
    static _STORAGE_KEY_CHARACTERS = "characterCreatorCharacters";

    constructor() {
        this._creatorUi = null;
        this._isIgnoreHashChanges = false;
    }

    async pInit() {
        await Promise.all([
            PrereleaseUtil.pInit(),
            BrewUtil2.pInit(),
        ]);
        await ExcludeUtil.pInitialise();

        const [races, backgrounds, feats, classes, spells, items] = await Promise.all([
            this._pLoadRaces(),
            this._pLoadBackgrounds(),
            this._pLoadFeats(),
            this._pLoadClasses(),
            this._pLoadSpells(),
            this._pLoadItems(),
        ]);

        this._creatorUi = new CharacterCreatorUi({
            races,
            backgrounds,
            feats,
            classes,
            spells,
            items,
            tabMetasAdditional: this._getAdditionalTabMetas(),
        });

        await this._creatorUi.pInit();

        this._creatorUi.addHookActiveTag(() => this._setHashFromTab());
        const savedStateDebounced = MiscUtil.throttle(this._pDoSaveState.bind(this), 100);
        this._creatorUi.addHookAll("state", () => savedStateDebounced());

        window.addEventListener("hashchange", () => this._handleHashChange());
        const setStateFromHash = this._handleHashChange();

        if (!setStateFromHash) {
            const savedState = await StorageUtil.pGetForPage(CharacterCreatorPage._STORAGE_KEY_STATE);
            if (savedState != null) this._creatorUi.setStateFrom(savedState);
        }

        this._creatorUi.render(es(`#charcreator-main`));

        window.dispatchEvent(new Event("toolsLoaded"));
    }

    _getAdditionalTabMetas() {
        return [
            new TabUiUtil.TabMeta({
                type: "buttons",
                buttons: [
                    {
                        html: `<span class="glyphicon glyphicon-download"></span>`,
                        title: "Save to File",
                        pFnClick: () => {
                            DataUtil.userDownload("character", this._creatorUi.getSaveableState(), { fileType: "character" });
                        },
                    },
                ],
            }),
            new TabUiUtil.TabMeta({
                type: "buttons",
                buttons: [
                    {
                        html: `<span class="glyphicon glyphicon-upload"></span>`,
                        title: "Load from File",
                        pFnClick: async () => {
                            const { jsons, errors } = await InputUiUtil.pGetUserUploadJson({ expectedFileTypes: ["character"] });

                            DataUtil.doHandleFileLoadErrorsGeneric(errors);

                            if (!jsons?.length) return;
                            this._creatorUi.setStateFrom(jsons[0], true);
                        },
                    },
                ],
            }),
            new TabUiUtil.TabMeta({
                type: "buttons",
                buttons: [
                    {
                        html: `<span class="glyphicon glyphicon-refresh"></span>`,
                        title: "Reset All",
                        type: "danger",
                        pFnClick: async () => {
                            if (!await InputUiUtil.pGetUserBoolean({
                                title: "Reset Character",
                                htmlDescription: `<div>This will reset all character data.<br>Are you sure?</div>`,
                            })) return;

                            this._creatorUi.doResetAll();
                        },
                    },
                ],
            }),
        ];
    }

    async _pDoSaveState() {
        const creatorState = this._creatorUi.getSaveableState();
        await StorageUtil.pSetForPage(CharacterCreatorPage._STORAGE_KEY_STATE, creatorState);
    }

    async _pLoadRaces() {
        const cpyRaces = MiscUtil.copyFast(
            [
                ...(await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_RACES)),
                ...(await DataLoader.pCacheAndGetAllPrerelease(UrlUtil.PG_RACES)),
                ...(await DataLoader.pCacheAndGetAllBrew(UrlUtil.PG_RACES)),
            ]
                .filter(it => {
                    const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_RACES](it);
                    return !ExcludeUtil.isExcluded(hash, "race", it.source);
                }),
        );

        const styleHint = VetoolsConfig.get("styleSwitcher", "style");
        cpyRaces.forEach(ent => UtilsEntityRace.mutMigrateForVersion(ent, { styleHint }));

        return cpyRaces;
    }

    async _pLoadBackgrounds() {
        const cpyBackgrounds = MiscUtil.copyFast(
            [
                ...(await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_BACKGROUNDS)),
                ...(await DataLoader.pCacheAndGetAllPrerelease(UrlUtil.PG_BACKGROUNDS)),
                ...(await DataLoader.pCacheAndGetAllBrew(UrlUtil.PG_BACKGROUNDS)),
            ]
                .filter(it => {
                    const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_BACKGROUNDS](it);
                    return !ExcludeUtil.isExcluded(hash, "background", it.source);
                }),
        );

        const styleHint = VetoolsConfig.get("styleSwitcher", "style");
        cpyBackgrounds.forEach(ent => UtilsEntityBackground.mutMigrateForVersion(ent, { styleHint }));

        return cpyBackgrounds;
    }

    async _pLoadFeats() {
        return [
            ...(await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_FEATS)),
            ...(await DataLoader.pCacheAndGetAllPrerelease(UrlUtil.PG_FEATS)),
            ...(await DataLoader.pCacheAndGetAllBrew(UrlUtil.PG_FEATS)),
        ]
            .filter(it => {
                const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS](it);
                return !ExcludeUtil.isExcluded(hash, "feat", it.source);
            });
    }

    async _pLoadClasses() {
        return [
            ...(await DataLoader.pCacheAndGetAllSite("class")),
            ...(await DataLoader.pCacheAndGetAllPrerelease("class")),
            ...(await DataLoader.pCacheAndGetAllBrew("class")),
        ]
            .filter(it => {
                const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](it);
                return !ExcludeUtil.isExcluded(hash, "class", it.source);
            });
    }

    async _pLoadSpells() {
        return [
            ...(await DataLoader.pCacheAndGetAllSite(UrlUtil.PG_SPELLS)),
            ...(await DataLoader.pCacheAndGetAllPrerelease(UrlUtil.PG_SPELLS)),
            ...(await DataLoader.pCacheAndGetAllBrew(UrlUtil.PG_SPELLS)),
        ]
            .filter(it => {
                const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS](it);
                return !ExcludeUtil.isExcluded(hash, "spell", it.source);
            });
    }

    async _pLoadItems() {
        const allItems = await Renderer.item.pBuildList();
        return allItems
            .filter(it => !it._isItemGroup)
            .filter(it => {
                const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS](it);
                return !ExcludeUtil.isExcluded(hash, "item", it.source);
            });
    }

    _setTabFromHash(tabName) {
        this._isIgnoreHashChanges = true;
        const ixTab = this._creatorUi.TABS.indexOf(tabName);
        this._creatorUi.ixActiveTab = ~ixTab ? ixTab : 0;
        this._isIgnoreHashChanges = false;
    }

    _setHashFromTab() {
        this._isIgnoreHashChanges = true;
        window.location.hash = this._creatorUi.TABS[this._creatorUi.ixActiveTab];
        this._isIgnoreHashChanges = false;
    }

    _handleHashChange() {
        if (this._isIgnoreHashChanges) return false;

        const hash = (window.location.hash.slice(1) || "").trim().toLowerCase();

        if (!this._creatorUi.TABS.includes(hash)) {
            window.history.replaceState(
                {},
                document.title,
                `${location.origin}${location.pathname}#${this._creatorUi.TABS[0]}`,
            );
            return this._handleHashChange();
        }

        this._setTabFromHash(hash);
        return true;
    }
}

const characterCreatorPage = new CharacterCreatorPage();
window.addEventListener("load", () => characterCreatorPage.pInit());
