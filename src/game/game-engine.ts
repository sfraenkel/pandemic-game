import { Scenario } from '../simulator/scenarios/Scenarios';
import { NextTurnState, PlayerActions, Indicators, isNextTurn, VictoryState } from '../simulator/SimulatorState';
import { RecordedInGameEventChoice } from '../simulator/in-game-events/InGameEvents';
import { createGameUI } from './createGameUI';
import { CapabilityImprovements, ContainmentPolicy } from '../simulator/player-actions/PlayerActions';
import { setControlsToTurn, showWinScreen, updateIndicators } from './setGameUI';
import { months } from '../lib/util';
import { Simulator } from '../simulator/Simulator';
import { WelcomeEvent } from '../simulator/in-game-events/WelcomeEvent';

interface CurrentUISelection {
    transport: boolean;
    masks: boolean;
    schools: boolean;
    business: boolean;
}

type AvailableActions = 'transport' | 'masks' | 'schools' | 'business';

export class GameEngine {
    private scenario: Scenario;
    private simulator: Simulator;
    private currentlySelectedActions: CurrentUISelection;

    constructor(scenario: Scenario) {
        this.scenario = scenario;
        this.simulator = new Simulator(scenario);
        this.currentlySelectedActions = {
            transport: false,
            masks: false,
            schools: false,
            business: false
        };
    }

    start() {
        const onPlayerSelectsAction = (action: AvailableActions) => {
            this.currentlySelectedActions[action] = !this.currentlySelectedActions[action];
        };

        const onEndTurn = () => {
            const month = months[this.simulator.lastTurn() % months.length];
            const playerActions = this.collectPlayerActions();
            const nextTurn = this.simulator.nextTurn(playerActions, month.numDays);
            this.onNextTurn(nextTurn);
        };

        const onUndo = () => {
            this.undoLastTurn();
        };

        const onRestart = () => {
            // Quick and dirty restart
            window.location.reload();
        };

        createGameUI(this.scenario.initialContainmentPolicies, onPlayerSelectsAction, onEndTurn, onUndo, onRestart);
        setControlsToTurn(0, this.currentlySelectedActions, [WelcomeEvent], this.scenario.initialContainmentPolicies);
        const history = this.simulator.history(); // In the first turn total history is the last month history
        updateIndicators(0, history, history);
    }

    private undoLastTurn() {
        const lastState = this.simulator.state();
        const targetTurn = this.simulator.lastTurn();
        if (targetTurn >= 0) {
            // Map the previous player actions to the format used in the frontend
            const prevContainmentPolicies = lastState.currentTurn.playerActions.containmentPolicies;
            const prevChoices: CurrentUISelection = {
                transport: false,
                masks: false,
                schools: false,
                business: false
            };

            prevContainmentPolicies.forEach((it) => {
                prevChoices[it.id as AvailableActions] = true;
            });

            // Go back to the last turn

            this.simulator = this.simulator.reset(targetTurn);
            this.currentlySelectedActions = prevChoices;
            const simulatorState = this.simulator.state();
            const updatedTurn = this.simulator.lastTurn();
            // Reset the controls
            setControlsToTurn(
                updatedTurn,
                this.currentlySelectedActions,
                simulatorState.currentTurn.nextInGameEvents,
                this.scenario.initialContainmentPolicies
            );
            const lastTurnHistory = updatedTurn > 0 ? simulatorState.timeline[updatedTurn - 1].history : [];
            updateIndicators(updatedTurn, simulatorState.history, lastTurnHistory);
        }
    }

    private onNextTurn(nextTurn: NextTurnState | VictoryState) {
        const history = this.simulator.history();
        const currentTurn = this.simulator.lastTurn();
        if (isNextTurn(nextTurn)) {
            // Just another turn. Update the controls and indicators
            setControlsToTurn(
                currentTurn,
                this.currentlySelectedActions,
                nextTurn.newInGameEvents,
                this.scenario.initialContainmentPolicies
            );
            updateIndicators(currentTurn, history, nextTurn.lastTurnIndicators);
        } else {
            // Do the final graph update
            updateIndicators(currentTurn, history, nextTurn.lastTurnIndicators);

            // Show the win screen
            const totalCasesReducer = (acc: number, it: Indicators) => acc + it.numInfected;
            const totalCases = history.reduce(totalCasesReducer, 0);
            const totalCostReducer = (acc: number, it: Indicators) => acc + it.totalCost;
            const totalCost = history.reduce(totalCostReducer, 0);
            showWinScreen(totalCost, totalCases);
        }
    }

    private collectPlayerActions(): PlayerActions {
        const result = {
            containmentPolicies: [] as ContainmentPolicy[],
            capabilityImprovements: [] as CapabilityImprovements[],
            inGameEventChoices: [] as RecordedInGameEventChoice[]
        };

        for (let k in this.currentlySelectedActions) {
            if (this.currentlySelectedActions[k as AvailableActions]) {
                const containmentPolicy = this.scenario.initialContainmentPolicies.find((cp) => cp.id === k);
                if (containmentPolicy) {
                    result.containmentPolicies.push(containmentPolicy);
                }
            }
        }

        return result;
    }
}
