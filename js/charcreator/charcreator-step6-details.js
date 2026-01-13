import { VetoolsConfig } from "../utils-config/utils-config-config.js";

export class CharacterCreatorStep6Details extends BaseComponent {
	static _ALIGNMENTS = [
		"Lawful Good",
		"Neutral Good",
		"Chaotic Good",
		"Lawful Neutral",
		"True Neutral",
		"Chaotic Neutral",
		"Lawful Evil",
		"Neutral Evil",
		"Chaotic Evil",
	];

	constructor ({ parent }) {
		super();
		this._parent = parent;
	}

	render (wrpTab) {
		const wrp = ee`<div class="ve-flex-col w-100 h-100 p-2 charcreator__step charcreator__step--details overflow-y-auto">
			<h3 class="mb-3">Character Details</h3>
			<p class="mb-3">Add personality, backstory, and physical details to bring your character to life.</p>

			<div class="ve-flex-col gap-3">
				<div class="ve-flex-col" id="details-basics"></div>
				<div class="ve-flex-col" id="details-personality"></div>
				<div class="ve-flex-col" id="details-physical"></div>
				<div class="ve-flex-col" id="details-backstory"></div>
			</div>

			<div class="ve-flex-v-center mt-auto pt-3">
				<button class="ve-btn ve-btn-default" id="btn-details-prev">← Previous: Equipment</button>
				<button class="ve-btn ve-btn-primary ml-auto" id="btn-details-next">View Character Sheet →</button>
			</div>
		</div>`;

		wrpTab.append(wrp);

		this._renderBasics(wrp.querySelector("#details-basics"));
		this._renderPersonality(wrp.querySelector("#details-personality"));
		this._renderPhysical(wrp.querySelector("#details-physical"));
		this._renderBackstory(wrp.querySelector("#details-backstory"));
		this._bindNavigation(wrp);
	}

	_renderBasics (container) {
		const wrp = ee`<div class="ve-flex-col charcreator__details-section">
			<h4 class="mb-2">Basic Information</h4>

			<div class="ve-flex-col gap-2">
				<label class="ve-flex-v-center">
					<span class="charcreator__details-label">Character Name:</span>
					<input type="text" class="form-control form-control--minimal ve-flex-grow" id="char-name" placeholder="Enter character name">
				</label>

				<label class="ve-flex-v-center">
					<span class="charcreator__details-label">Alignment:</span>
					<select class="form-control form-control--minimal ve-flex-grow" id="char-alignment">
						<option value="">— Select —</option>
					</select>
				</label>

				<label class="ve-flex-v-center">
					<span class="charcreator__details-label">Level:</span>
					<input type="number" class="form-control form-control--minimal w-75p" id="char-level" value="1" min="1" max="20">
				</label>
			</div>
		</div>`;
		container.append(wrp);

		// Populate alignment dropdown
		const selAlignment = wrp.querySelector("#char-alignment");
		CharacterCreatorStep6Details._ALIGNMENTS.forEach(align => {
			const opt = ee`<option value="${align}">${align}</option>`;
			if (this._parent._state.char_alignment === align) opt.selected = true;
			selAlignment.append(opt);
		});

		// Bind inputs
		const iptName = wrp.querySelector("#char-name");
		iptName.value = this._parent._state.char_name || "";
		iptName.addEventListener("input", () => {
			this._parent._state.char_name = iptName.value;
		});

		selAlignment.addEventListener("change", () => {
			this._parent._state.char_alignment = selAlignment.value;
		});

		const iptLevel = wrp.querySelector("#char-level");
		iptLevel.value = this._parent._state.char_level || 1;
		iptLevel.addEventListener("change", () => {
			const level = Math.min(20, Math.max(1, Number(iptLevel.value) || 1));
			this._parent._state.char_level = level;
			iptLevel.value = level;
			this._recalculateHP();
		});
	}

	_recalculateHP () {
		const cls = this._parent.classes[this._parent._state.char_ixClass];
		if (!cls) return;

		const hdFaces = cls.hd?.faces || 8;
		const conMod = this._parent.getAbilityModifier(this._parent._state.char_con || 10);
		const level = this._parent._state.char_level || 1;

		// Level 1: max HD + CON mod
		// Higher levels: average HD (rounded up) + CON mod per level
		const level1HP = hdFaces + conMod;
		const avgHD = Math.ceil((hdFaces + 1) / 2);
		const higherLevelHP = (level - 1) * (avgHD + conMod);

		const maxHp = Math.max(1, level1HP + higherLevelHP);
		this._parent._state.char_hpMax = maxHp;
		this._parent._state.char_hpCurrent = maxHp;
	}

	_renderPersonality (container) {
		const wrp = ee`<div class="ve-flex-col charcreator__details-section">
			<h4 class="mb-2">Personality</h4>

			<div class="ve-flex-col gap-2">
				<label class="ve-flex-col">
					<span class="mb-1">Personality Traits:</span>
					<textarea class="form-control form-control--minimal" id="char-personality" rows="2" placeholder="Describe your character's personality..."></textarea>
				</label>

				<label class="ve-flex-col">
					<span class="mb-1">Ideals:</span>
					<textarea class="form-control form-control--minimal" id="char-ideals" rows="2" placeholder="What does your character believe in?"></textarea>
				</label>

				<label class="ve-flex-col">
					<span class="mb-1">Bonds:</span>
					<textarea class="form-control form-control--minimal" id="char-bonds" rows="2" placeholder="What connections does your character have?"></textarea>
				</label>

				<label class="ve-flex-col">
					<span class="mb-1">Flaws:</span>
					<textarea class="form-control form-control--minimal" id="char-flaws" rows="2" placeholder="What are your character's weaknesses?"></textarea>
				</label>
			</div>
		</div>`;
		container.append(wrp);

		// Bind textareas
		const fields = ["personality", "ideals", "bonds", "flaws"];
		fields.forEach(field => {
			const textarea = wrp.querySelector(`#char-${field}`);
			textarea.value = this._parent._state[`char_${field}`] || "";
			textarea.addEventListener("input", () => {
				this._parent._state[`char_${field}`] = textarea.value;
			});
		});
	}

	_renderPhysical (container) {
		const wrp = ee`<div class="ve-flex-col charcreator__details-section">
			<h4 class="mb-2">Physical Characteristics</h4>

			<div class="ve-flex ve-flex-wrap gap-2">
				<label class="ve-flex-v-center">
					<span class="charcreator__details-label-sm">Age:</span>
					<input type="text" class="form-control form-control--minimal w-75p" id="char-age" placeholder="Age">
				</label>

				<label class="ve-flex-v-center">
					<span class="charcreator__details-label-sm">Height:</span>
					<input type="text" class="form-control form-control--minimal w-75p" id="char-height" placeholder="e.g., 5'8&quot;">
				</label>

				<label class="ve-flex-v-center">
					<span class="charcreator__details-label-sm">Weight:</span>
					<input type="text" class="form-control form-control--minimal w-75p" id="char-weight" placeholder="e.g., 150 lbs">
				</label>

				<label class="ve-flex-v-center">
					<span class="charcreator__details-label-sm">Eyes:</span>
					<input type="text" class="form-control form-control--minimal w-75p" id="char-eyes" placeholder="Eye color">
				</label>

				<label class="ve-flex-v-center">
					<span class="charcreator__details-label-sm">Skin:</span>
					<input type="text" class="form-control form-control--minimal w-75p" id="char-skin" placeholder="Skin color">
				</label>

				<label class="ve-flex-v-center">
					<span class="charcreator__details-label-sm">Hair:</span>
					<input type="text" class="form-control form-control--minimal w-75p" id="char-hair" placeholder="Hair color/style">
				</label>
			</div>
		</div>`;
		container.append(wrp);

		// Bind inputs
		const fields = ["age", "height", "weight", "eyes", "skin", "hair"];
		fields.forEach(field => {
			const input = wrp.querySelector(`#char-${field}`);
			input.value = this._parent._state[`char_${field}`] || "";
			input.addEventListener("input", () => {
				this._parent._state[`char_${field}`] = input.value;
			});
		});
	}

	_renderBackstory (container) {
		const wrp = ee`<div class="ve-flex-col charcreator__details-section">
			<h4 class="mb-2">Backstory</h4>

			<label class="ve-flex-col">
				<textarea class="form-control form-control--minimal" id="char-backstory" rows="6" placeholder="Write your character's backstory..."></textarea>
			</label>
		</div>`;
		container.append(wrp);

		const textarea = wrp.querySelector("#char-backstory");
		textarea.value = this._parent._state.char_backstory || "";
		textarea.addEventListener("input", () => {
			this._parent._state.char_backstory = textarea.value;
		});
	}

	_bindNavigation (wrp) {
		const btnPrev = wrp.querySelector("#btn-details-prev");
		const btnNext = wrp.querySelector("#btn-details-next");

		btnPrev.addEventListener("click", () => {
			this._parent.ixActiveTab = 4;
		});

		btnNext.addEventListener("click", () => {
			// Prompt for name if not set
			if (!this._parent._state.char_name?.trim()) {
				const iptName = document.querySelector("#char-name");
				if (iptName) iptName.focus();
				JqueryUtil.doToast({ type: "warning", content: "Please enter a character name!" });
				return;
			}
			this._parent.ixActiveTab = 6;
		});
	}
}
