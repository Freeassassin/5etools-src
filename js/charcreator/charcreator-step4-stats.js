import { VetoolsConfig } from "../utils-config/utils-config-config.js";

export class CharacterCreatorStep4Stats extends BaseComponent {
	static _STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
	static _POINT_BUY_COSTS = {
		8: 0,
		9: 1,
		10: 2,
		11: 3,
		12: 4,
		13: 5,
		14: 7,
		15: 9,
	};
	static _POINT_BUY_BUDGET = 27;

	constructor ({ parent }) {
		super();
		this._parent = parent;
	}

	render (wrpTab) {
		const wrp = ee`<div class="ve-flex-col w-100 h-100 p-2 charcreator__step charcreator__step--stats">
			<h3 class="mb-3">Determine Ability Scores</h3>
			<p class="mb-2">Choose how you want to generate your ability scores. The 2024 Player's Handbook recommends Point Buy or Standard Array for balanced characters.</p>

			<div class="ve-flex-col mb-3" id="stats-method-selector"></div>
			<div class="ve-flex-col mb-3" id="stats-generator"></div>
			<div class="ve-flex-col mb-3" id="stats-summary"></div>

			<div class="ve-flex-v-center mt-auto pt-3">
				<button class="ve-btn ve-btn-default" id="btn-stats-prev">← Previous: Background</button>
				<button class="ve-btn ve-btn-primary ml-auto" id="btn-stats-next">Next: Equipment →</button>
			</div>
		</div>`;

		wrpTab.append(wrp);

		this._renderMethodSelector(wrp.querySelector("#stats-method-selector"));
		this._renderGenerator(wrp.querySelector("#stats-generator"));
		this._renderSummary(wrp.querySelector("#stats-summary"));
		this._bindNavigation(wrp);
	}

	_renderMethodSelector (container) {
		const methods = [
			{ id: "pointbuy", name: "Point Buy", desc: "Spend 27 points to customize your scores (recommended)" },
			{ id: "array", name: "Standard Array", desc: "Assign 15, 14, 13, 12, 10, 8 to your abilities" },
			{ id: "rolled", name: "Roll", desc: "Roll 4d6, drop lowest, six times" },
			{ id: "manual", name: "Manual Entry", desc: "Enter scores directly" },
		];

		const wrp = ee`<div class="ve-flex ve-flex-wrap gap-2 charcreator__stats-methods"></div>`;

		methods.forEach(method => {
			const isSelected = this._parent._state.char_statMethod === method.id;
			const btn = ee`<button class="ve-btn ${isSelected ? "ve-btn-primary" : "ve-btn-default"} charcreator__stats-method-btn" data-method="${method.id}">
				<div class="charcreator__stats-method-name">${method.name}</div>
				<div class="charcreator__stats-method-desc ve-muted ve-small">${method.desc}</div>
			</button>`;

			btn.onn("click", () => this._selectMethod(method.id));
			wrp.append(btn);
		});

		container.append(wrp);
	}

	_selectMethod (method) {
		this._parent._state.char_statMethod = method;

		// Update button states
		document.querySelectorAll(".charcreator__stats-method-btn").forEach(btn => {
			btn.classList.toggle("ve-btn-primary", btn.dataset.method === method);
			btn.classList.toggle("ve-btn-default", btn.dataset.method !== method);
		});

		// Update generator display
		this._updateGenerator();
	}

	_renderGenerator (container) {
		const wrp = ee`<div class="ve-flex-col" id="stats-generator-content"></div>`;
		container.append(wrp);
		this._updateGenerator();

		// Hook for method changes
		this._parent._addHookBase("char_statMethod", () => this._updateGenerator());
	}

	_updateGenerator () {
		const container = document.querySelector("#stats-generator-content");
		if (!container) return;

		container.innerHTML = "";

		const method = this._parent._state.char_statMethod || "pointbuy";

		switch (method) {
			case "pointbuy":
				this._renderPointBuy(container);
				break;
			case "array":
				this._renderStandardArray(container);
				break;
			case "rolled":
				this._renderRolled(container);
				break;
			case "manual":
				this._renderManual(container);
				break;
		}
	}

	_renderPointBuy (container) {
		const wrp = ee`<div class="ve-flex-col charcreator__stats-pointbuy"></div>`;

		// Points remaining display
		const pointsUsed = this._calculatePointsUsed();
		const pointsRemaining = CharacterCreatorStep4Stats._POINT_BUY_BUDGET - pointsUsed;

		const wrpBudget = ee`<div class="ve-flex-v-center mb-3">
			<div class="mr-3"><strong>Points Remaining:</strong></div>
			<div class="charcreator__stats-points ${pointsRemaining < 0 ? "charcreator__stats-points--error" : ""}" id="points-remaining">${pointsRemaining}</div>
			<div class="ml-1 ve-muted">/ ${CharacterCreatorStep4Stats._POINT_BUY_BUDGET}</div>
		</div>`;
		wrp.append(wrpBudget);

		// Ability score controls
		const wrpScores = ee`<div class="ve-flex-col gap-2"></div>`;

		Parser.ABIL_ABVS.forEach(ab => {
			const score = this._parent._state[`char_${ab}`] || 8;
			const mod = this._parent.getAbilityModifier(score);
			const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
			const cost = CharacterCreatorStep4Stats._POINT_BUY_COSTS[score] ?? 0;

			const row = ee`<div class="ve-flex-v-center charcreator__stats-row">
				<div class="charcreator__stats-label">${Parser.attAbvToFull(ab)}</div>
				<button class="ve-btn ve-btn-default ve-btn-xs charcreator__stats-btn-dec" data-ab="${ab}" ${score <= 8 ? "disabled" : ""}>−</button>
				<div class="charcreator__stats-score" data-ab="${ab}">${score}</div>
				<button class="ve-btn ve-btn-default ve-btn-xs charcreator__stats-btn-inc" data-ab="${ab}" ${score >= 15 ? "disabled" : ""}>+</button>
				<div class="charcreator__stats-mod">(${modStr})</div>
				<div class="charcreator__stats-cost ve-muted ve-small">Cost: ${cost}</div>
			</div>`;

			row.querySelector(".charcreator__stats-btn-dec").addEventListener("click", () => this._adjustScore(ab, -1));
			row.querySelector(".charcreator__stats-btn-inc").addEventListener("click", () => this._adjustScore(ab, 1));

			wrpScores.append(row);
		});

		wrp.append(wrpScores);

		// Reset button
		const btnReset = ee`<button class="ve-btn ve-btn-default ve-btn-xs mt-2">Reset to 8s</button>`;
		btnReset.onn("click", () => this._resetScores(8));
		wrp.append(btnReset);

		container.append(wrp);
	}

	_adjustScore (ab, delta) {
		const prop = `char_${ab}`;
		const currentScore = this._parent._state[prop] || 8;
		const newScore = currentScore + delta;

		// Validate point buy limits
		if (this._parent._state.char_statMethod === "pointbuy") {
			if (newScore < 8 || newScore > 15) return;

			// Check if we have enough points
			if (delta > 0) {
				const currentCost = CharacterCreatorStep4Stats._POINT_BUY_COSTS[currentScore] ?? 0;
				const newCost = CharacterCreatorStep4Stats._POINT_BUY_COSTS[newScore] ?? 0;
				const costDelta = newCost - currentCost;
				const pointsUsed = this._calculatePointsUsed();
				if (pointsUsed + costDelta > CharacterCreatorStep4Stats._POINT_BUY_BUDGET) {
					JqueryUtil.doToast({ type: "warning", content: "Not enough points remaining!" });
					return;
				}
			}
		}

		this._parent._state[prop] = newScore;
		this._updateGenerator();
		this._updateSummary();
		this._recalculateHP();
	}

	_calculatePointsUsed () {
		let total = 0;
		Parser.ABIL_ABVS.forEach(ab => {
			const score = this._parent._state[`char_${ab}`] || 8;
			total += CharacterCreatorStep4Stats._POINT_BUY_COSTS[score] ?? 0;
		});
		return total;
	}

	_renderStandardArray (container) {
		const wrp = ee`<div class="ve-flex-col charcreator__stats-array"></div>`;

		const usedIndices = new Set();
		Parser.ABIL_ABVS.forEach(ab => {
			const score = this._parent._state[`char_${ab}`];
			const ix = CharacterCreatorStep4Stats._STANDARD_ARRAY.indexOf(score);
			if (~ix) usedIndices.add(ix);
		});

		const wrpInstructions = ee`<div class="mb-3">Assign each score from the standard array to an ability:</div>`;
		wrp.append(wrpInstructions);

		const wrpScores = ee`<div class="ve-flex-col gap-2"></div>`;

		Parser.ABIL_ABVS.forEach(ab => {
			const currentScore = this._parent._state[`char_${ab}`];
			const mod = this._parent.getAbilityModifier(currentScore || 10);
			const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

			const row = ee`<div class="ve-flex-v-center charcreator__stats-row">
				<div class="charcreator__stats-label">${Parser.attAbvToFull(ab)}</div>
				<select class="form-control form-control--minimal charcreator__stats-select" data-ab="${ab}">
					<option value="">—</option>
				</select>
				<div class="charcreator__stats-mod">(${modStr})</div>
			</div>`;

			const sel = row.querySelector("select");
			CharacterCreatorStep4Stats._STANDARD_ARRAY.forEach((score, ix) => {
				const opt = ee`<option value="${score}">${score}</option>`;
				if (currentScore === score) opt.selected = true;
				sel.append(opt);
			});

			sel.addEventListener("change", () => {
				const newScore = sel.value ? Number(sel.value) : null;
				this._setArrayScore(ab, newScore);
			});

			wrpScores.append(row);
		});

		wrp.append(wrpScores);

		// Random assign button
		const btnRandom = ee`<button class="ve-btn ve-btn-default ve-btn-xs mt-2">Randomly Assign</button>`;
		btnRandom.onn("click", () => this._randomAssignArray());
		wrp.append(btnRandom);

		container.append(wrp);
	}

	_setArrayScore (ab, score) {
		// Clear any other ability using this score
		if (score != null) {
			Parser.ABIL_ABVS.forEach(otherAb => {
				if (otherAb !== ab && this._parent._state[`char_${otherAb}`] === score) {
					this._parent._state[`char_${otherAb}`] = null;
				}
			});
		}

		this._parent._state[`char_${ab}`] = score;
		this._updateGenerator();
		this._updateSummary();
		this._recalculateHP();
	}

	_randomAssignArray () {
		const shuffled = [...CharacterCreatorStep4Stats._STANDARD_ARRAY].shuffle();
		Parser.ABIL_ABVS.forEach((ab, ix) => {
			this._parent._state[`char_${ab}`] = shuffled[ix];
		});
		this._updateGenerator();
		this._updateSummary();
		this._recalculateHP();
	}

	_renderRolled (container) {
		const wrp = ee`<div class="ve-flex-col charcreator__stats-rolled"></div>`;

		const wrpFormula = ee`<div class="ve-flex-v-center mb-3">
			<label class="mr-2">Formula:</label>
			<input type="text" class="form-control form-control--minimal w-100p" value="4d6kh3" id="roll-formula">
			<button class="ve-btn ve-btn-primary ml-2" id="btn-roll-stats">Roll!</button>
		</div>`;
		wrp.append(wrpFormula);

		// Display rolled values
		const wrpRolls = ee`<div class="ve-flex ve-flex-wrap gap-2 mb-3" id="rolled-values"></div>`;
		wrp.append(wrpRolls);

		// Show current rolled stats
		if (this._parent._state.char_rolledStats?.length) {
			this._displayRolledStats(wrpRolls);
		}

		// Ability assignment
		const wrpScores = ee`<div class="ve-flex-col gap-2" id="rolled-assignment"></div>`;
		this._renderRolledAssignment(wrpScores);
		wrp.append(wrpScores);

		// Bind roll button
		wrpFormula.querySelector("#btn-roll-stats").addEventListener("click", async () => {
			const formula = wrpFormula.querySelector("#roll-formula").value || "4d6kh3";
			await this._rollStats(formula);
		});

		container.append(wrp);
	}

	async _rollStats (formula) {
		const rolls = [];
		for (let i = 0; i < 6; i++) {
			const result = await this._rollFormula(formula);
			rolls.push(result);
		}
		rolls.sort((a, b) => b.total - a.total);

		this._parent._state.char_rolledStats = rolls;

		// Display the rolls
		const container = document.querySelector("#rolled-values");
		if (container) {
			this._displayRolledStats(container);
		}

		// Reset assignments
		Parser.ABIL_ABVS.forEach(ab => {
			this._parent._state[`char_${ab}`] = null;
		});

		this._updateGenerator();
	}

	async _rollFormula (formula) {
		const wrpTree = Renderer.dice.lang.getTree3(formula);
		if (!wrpTree) {
			return { total: 10, text: "Invalid formula" };
		}

		const meta = {};
		const total = wrpTree.tree.evl(meta);
		return { total, text: (meta.text || []).join("") };
	}

	_displayRolledStats (container) {
		container.innerHTML = "";

		const rolls = this._parent._state.char_rolledStats || [];
		rolls.forEach((roll, ix) => {
			const el = ee`<div class="charcreator__stats-rolled-value" title="${roll.text || ""}">
				<div class="charcreator__stats-rolled-total">${roll.total}</div>
				<div class="charcreator__stats-rolled-index ve-muted ve-small">#${ix + 1}</div>
			</div>`;
			container.append(el);
		});

		// Update assignment UI
		const assignContainer = document.querySelector("#rolled-assignment");
		if (assignContainer) {
			this._renderRolledAssignment(assignContainer);
		}
	}

	_renderRolledAssignment (container) {
		container.innerHTML = "";

		const rolls = this._parent._state.char_rolledStats || [];
		if (!rolls.length) {
			container.innerHTML = `<div class="ve-muted">Roll stats first to assign them</div>`;
			return;
		}

		Parser.ABIL_ABVS.forEach(ab => {
			const currentScore = this._parent._state[`char_${ab}`];
			const mod = this._parent.getAbilityModifier(currentScore || 10);
			const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

			const row = ee`<div class="ve-flex-v-center charcreator__stats-row">
				<div class="charcreator__stats-label">${Parser.attAbvToFull(ab)}</div>
				<select class="form-control form-control--minimal charcreator__stats-select" data-ab="${ab}">
					<option value="">—</option>
				</select>
				<div class="charcreator__stats-mod">(${modStr})</div>
			</div>`;

			const sel = row.querySelector("select");
			rolls.forEach((roll, ix) => {
				const opt = ee`<option value="${roll.total}:${ix}">${roll.total}</option>`;
				if (currentScore === roll.total) opt.selected = true;
				sel.append(opt);
			});

			sel.addEventListener("change", () => {
				const [score, ix] = sel.value ? sel.value.split(":").map(Number) : [null, null];
				this._setRolledScore(ab, score, ix);
			});

			container.append(row);
		});
	}

	_setRolledScore (ab, score, ix) {
		// Clear any other ability using this roll index
		if (score != null) {
			const rolls = this._parent._state.char_rolledStats || [];
			Parser.ABIL_ABVS.forEach(otherAb => {
				if (otherAb !== ab) {
					const otherScore = this._parent._state[`char_${otherAb}`];
					const otherIx = rolls.findIndex(r => r.total === otherScore);
					if (otherIx === ix) {
						this._parent._state[`char_${otherAb}`] = null;
					}
				}
			});
		}

		this._parent._state[`char_${ab}`] = score;
		this._updateGenerator();
		this._updateSummary();
		this._recalculateHP();
	}

	_renderManual (container) {
		const wrp = ee`<div class="ve-flex-col charcreator__stats-manual"></div>`;

		const wrpInstructions = ee`<div class="mb-3">Enter your ability scores directly (typically 3-18):</div>`;
		wrp.append(wrpInstructions);

		const wrpScores = ee`<div class="ve-flex-col gap-2"></div>`;

		Parser.ABIL_ABVS.forEach(ab => {
			const score = this._parent._state[`char_${ab}`] || 10;
			const mod = this._parent.getAbilityModifier(score);
			const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

			const row = ee`<div class="ve-flex-v-center charcreator__stats-row">
				<div class="charcreator__stats-label">${Parser.attAbvToFull(ab)}</div>
				<input type="number" class="form-control form-control--minimal charcreator__stats-input" data-ab="${ab}" value="${score}" min="1" max="30">
				<div class="charcreator__stats-mod">(${modStr})</div>
			</div>`;

			row.querySelector("input").addEventListener("change", (e) => {
				const newScore = Number(e.target.value) || 10;
				this._parent._state[`char_${ab}`] = Math.min(30, Math.max(1, newScore));
				this._updateGenerator();
				this._updateSummary();
				this._recalculateHP();
			});

			wrpScores.append(row);
		});

		wrp.append(wrpScores);
		container.append(wrp);
	}

	_resetScores (defaultValue) {
		Parser.ABIL_ABVS.forEach(ab => {
			this._parent._state[`char_${ab}`] = defaultValue;
		});
		this._updateGenerator();
		this._updateSummary();
		this._recalculateHP();
	}

	_recalculateHP () {
		const cls = this._parent.classes[this._parent._state.char_ixClass];
		if (!cls) return;

		const hdFaces = cls.hd?.faces || 8;
		const conMod = this._parent.getAbilityModifier(this._parent._state.char_con || 10);
		const maxHp = hdFaces + conMod;

		this._parent._state.char_hpMax = Math.max(1, maxHp);
		this._parent._state.char_hpCurrent = Math.max(1, maxHp);
	}

	_renderSummary (container) {
		const wrp = ee`<div class="ve-flex-col p-2 charcreator__stats-summary" id="stats-summary-content"></div>`;
		container.append(wrp);
		this._updateSummary();

		// Hooks for score changes
		Parser.ABIL_ABVS.forEach(ab => {
			this._parent._addHookBase(`char_${ab}`, () => this._updateSummary());
		});
	}

	_updateSummary () {
		const container = document.querySelector("#stats-summary-content");
		if (!container) return;

		let html = `<h5 class="mb-2">Ability Score Summary</h5>`;
		html += `<div class="ve-flex ve-flex-wrap gap-3">`;

		Parser.ABIL_ABVS.forEach(ab => {
			const score = this._parent._state[`char_${ab}`] || 10;
			const mod = this._parent.getAbilityModifier(score);
			const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

			html += `<div class="charcreator__stats-summary-item">
				<div class="charcreator__stats-summary-label">${ab.toUpperCase()}</div>
				<div class="charcreator__stats-summary-score">${score}</div>
				<div class="charcreator__stats-summary-mod">${modStr}</div>
			</div>`;
		});

		html += `</div>`;

		// Total and modifier sum
		const totalScore = Parser.ABIL_ABVS.reduce((sum, ab) => sum + (this._parent._state[`char_${ab}`] || 10), 0);
		const totalMod = Parser.ABIL_ABVS.reduce((sum, ab) => sum + this._parent.getAbilityModifier(this._parent._state[`char_${ab}`] || 10), 0);

		html += `<div class="mt-2 ve-muted ve-small">Total: ${totalScore} | Modifier Sum: ${totalMod >= 0 ? "+" : ""}${totalMod}</div>`;

		container.innerHTML = html;
	}

	_bindNavigation (wrp) {
		const btnPrev = wrp.querySelector("#btn-stats-prev");
		const btnNext = wrp.querySelector("#btn-stats-next");

		btnPrev.addEventListener("click", () => {
			this._parent.ixActiveTab = 2;
		});

		btnNext.addEventListener("click", () => {
			// Validate that all scores are set
			const allSet = Parser.ABIL_ABVS.every(ab => this._parent._state[`char_${ab}`] != null);
			if (!allSet) {
				JqueryUtil.doToast({ type: "warning", content: "Please set all ability scores!" });
				return;
			}
			this._parent.ixActiveTab = 4;
		});
	}
}
