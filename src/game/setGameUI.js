/*

setGameUI
=============
Description:
Sets the display of UI elements for the game 

Use:
Sets UI display given the player's in-game turn and actions

*/

import * as $ from 'jquery';
import { nFormatter, months } from '../lib/util';
import { buildCasesChart, updateCasesChart } from './LineChart.ts';

// Hide and disable all buttons
export const resetControls = () => {
    // Disable and hide all choices
    $('.player-action')
        .prop('disabled', true) // Disable
        .attr('data-active', 'inactive') // Reset activation status
        .animate({ opacity: 0.1 }, 'slow') // Hide
        .addClass('btn-light') // Reset active styling
        .removeClass('btn-danger')
        .removeClass('btn-success');
};

export const setControlsToTurn = (playerTurn, dictOfActivePolicies, inGameEvents, initialContainmentPolicies) => {
    // If game initialised or reset re-init controls
    if (playerTurn === 0) {
        // Reset controls
        resetControls();

        // Else if game is in play
    } else {
        // Style previous choices
        $(`[id^="turn${playerTurn - 1}-"]`)
            .prop('disabled', true) // Disable
            .animate({ opacity: 0.5 }, 'slow'); // Hide
    }

    // Style current choices
    $(`[id^="turn${playerTurn}-"]`).each((_idx, domNode) => {
        // Enable and style by activation
        const target = $(domNode);
        const choiceIsActive = dictOfActivePolicies[target.data('action')];

        const choice = initialContainmentPolicies.find((it) => it.id === target.data('action'));
        // eslint-disable-next-line no-nested-ternary
        const label = choice ? (choiceIsActive ? choice.activeLabel : choice.inactiveLabel) : '';
        target
            .html(label)
            .removeClass('btn-light')
            .removeClass(choiceIsActive ? 'btn-light' : 'btn-success')
            .addClass(choiceIsActive ? 'btn-success' : 'btn-light') // Green = active, red = inactive
            .prop('disabled', false) // Enable
            .animate({ opacity: 1 }, 'slow'); // Show
    });

    // Remove styles from future choices
    $(`[id^="turn${playerTurn + 1}-"]`)
        .prop('disabled', true) // Disable
        .removeClass('btn-light')
        .removeClass('btn-success')
        .animate({ opacity: 0.1 }, 'slow'); // Hide

    $('#events-holder').html('');
    inGameEvents.forEach((evt) => {
        $('#events-holder').append(`<div class="${evt.cssClass}" data-event="${evt.name}">${evt.description}</div>`);
    });
};

const setChangeValues = (newValue, oldValue, diffElm, grothElm, currentElm, days, olddays) => {
	if (newValue*olddays > days*oldValue) {
        diffElm
            .removeClass('negative')
            .addClass('positive')
            .html(`${olddays === 1 ? '&nbsp;' : '+'+nFormatter(newValue - oldValue)}`);
        grothElm
            .removeClass('negative')
            .addClass('positive')
            .html((oldValue === 0) || (olddays === 1) ? '&nbsp;' : `+${Math.floor((1000 * (newValue - oldValue)) / oldValue / 10)}%`);
        currentElm.removeClass('negative').addClass('positive');
    } else if (newValue*olddays < days*oldValue) {
        diffElm
            .removeClass('positive')
            .addClass('negative')
            .html((olddays === 1) ? '&nbsp;' : nFormatter(newValue - oldValue));
        grothElm
            .removeClass('positive')
            .addClass('negative')
            .html((oldValue === 0) || (olddays === 1) ? '&nbsp;' : `${Math.floor((1000 * (newValue - oldValue)) / oldValue / 10)}%`);
        currentElm.removeClass('positive').addClass('negative');
    } else {
        diffElm.removeClass('positive negative').html('0');
        grothElm.removeClass('positive negative').html('0%');
        currentElm.removeClass('positive negative');
    }
};

let casesChart;

const getMonthValues = (history, month)=>{
	if (month === -1){
		const lastHistoryEntry = history[0];
		return {
			"cases": lastHistoryEntry.numInfected,
			"death": lastHistoryEntry.numDead,
			"cost":  lastHistoryEntry.totalCost,
			"days":  1,
		}
	} 	
	if(month >= 0){	
		const daysToMonth = months.slice(0,month);
		const firstDayInMonth = (month === 0) ? 1 : daysToMonth.reduce((acc,cur)=>{return acc+cur.numDays},1);
		const monthHistory = history.slice(firstDayInMonth,firstDayInMonth+months[month].numDays);
		return {
			"cases": monthHistory.reduce((acc,cur)=>{return acc+cur.numInfected},0),
			"death": monthHistory.reduce((acc,cur)=>{return acc+cur.numDead},0),
			"cost":  monthHistory.reduce((acc,cur)=>{return acc+cur.totalCost},0),
			"days":	 months[month].numDays, 
		}
	} 
	return null;
}

export const updateIndicators = (history) => {
	if (history.length === 0) {
        console.warn('History should not be empty. Indicators will not be renderer correctly');
    } else {
		const totalcases = history.reduce((acc, cur) => {
			return acc + cur.numInfected;
		}, 0);
		const totaldeaths = history.reduce((acc, cur) => {
			return acc + cur.numDead;
		}, 0);
		const totalcosts = history.reduce((acc, cur) => {
			return acc + cur.totalCost;
		}, 0);
		$(`#cases-total`).html(nFormatter(totalcases - history[0].numInfected, 1));
		$(`#deaths-total`).html(nFormatter(totaldeaths - history[0].numDead, 0));
		$(`#cost-total`).html("$ "+nFormatter(totalcosts - history[0].totalCost, 1));
		const monthIdx = Math.floor(history.length / 30) % months.length -1;	
		const monthValues = getMonthValues(history,monthIdx);
        $(`#cases-current`).html(nFormatter(monthValues.cases, 1));
        $(`#deaths-current`).html(nFormatter(monthValues.death, 0));
        $(`#cost-current`).html(`$ ${nFormatter(monthValues.cost, 1)}`);
		
		const oldMonthValues = getMonthValues(history,monthIdx-1);
        if (oldMonthValues !== null) {
            setChangeValues(
                monthValues.cases,
                oldMonthValues.cases,
                $(`#cases-differeces`),
                $(`#cases-growth`),
                $(`#cases-current`),
				monthValues.days,
				oldMonthValues.days
            );
            setChangeValues(
                monthValues.death,
                oldMonthValues.death,
                $(`#deaths-differeces`),
                $(`#deaths-growth`),
                $(`#deaths-current`),
				monthValues.days,
				oldMonthValues.days
            );
            setChangeValues(
                monthValues.cost,
                oldMonthValues.cost,
                $(`#cost-differeces`),
                $(`#cost-growth`),
                $(`#cost-current`),
				monthValues.days,
				oldMonthValues.days
            );
        }
		if(monthIdx == -1){
			$('#date-current').html("Yesterday:");
		} else {
			$('#date-current').html(`Month of ${months[monthIdx].longName}:`);
		}
    }

    const fullYear = 365;
    const costHistory = [];
    const caseHistory = [];
    history.forEach((entry) => {
        const targetDate = new Date(Date.UTC(2020, 0, 1));
        targetDate.setDate(targetDate.getDate() + entry.days);
        costHistory.push({ x: targetDate, y: entry.totalCost });
        caseHistory.push({ x: targetDate, y: entry.numInfected });
    });

    const lastDay = history.length > 0 ? history[history.length - 1].days + 1 : 1;
    // eslint-disable-next-line no-plusplus
    for (let futureDay = lastDay; futureDay <= fullYear; futureDay++) {
        const targetDate = new Date(Date.UTC(2020, 0, 1));
        targetDate.setDate(targetDate.getDate() + futureDay);
        costHistory.push({ x: targetDate, y: null });
        caseHistory.push({ x: targetDate, y: null });
    }

    if (!casesChart) {
        casesChart = buildCasesChart('cases-graph', caseHistory, costHistory);
    } else {
        updateCasesChart(casesChart, caseHistory, costHistory);
    }
};

export const showWinScreen = (totalCost, totalCases) => {
    $(`#win-total-cases`).html(nFormatter(totalCases, 1));
    $(`#win-total-costs`).html(`$ ${nFormatter(totalCost, 1)}`);
    $('#win-screen').modal('show');
};
