/* eslint-disable no-plusplus */
import $ from 'jquery';
import { nFormatter, sum } from '../lib/util';

export default function runGame(env) {
    // Initialize pandemic simulator:

    let interval;
    let day = 0;
    let nextActionR = 1.08;

    // Initialize lock-down controls
	
	model_total_cases={
		"x_axis":{"name":"days","min":0,"max":400,"step":10,"formatter":(value => nFormatter(value,1)),},
		"y_axis":{"name":"humans","min":0,"max":400000000,"formatter":(value => nFormatter(value,1)),},
		"lines":[{"name":"total cases","color":"#000000",}],};
	model_cases={
		"x_axis":{"name":"days","min":0,"max":400,"step":10,"formatter":(value => nFormatter(value,1)),},
		"y_axis":{"name":"humans","min":0,"max":100000,"formatter":(value => nFormatter(value,1)),},
		"lines":[{"name":"cases","color":"#000000",}],};};
	model_total_cost={
		"x_axis":{"name":"days","min":0,"max":400,"step":10,"formatter":(value => nFormatter(value,1)),},
		"y_axis":{"name":"humans","min":0,"max":1200000000000,"formatter":(value => nFormatter(value,1)),},
		"lines":[{"name":"total costs","color":"#000000",}],};
	};
	model_cost={
		"x_axis":{"name":"days","min":0,"max":400,"step":10,"formatter":(value => nFormatter(value,1)),},
		"y_axis":{"name":"humans","min":0,"max":120000000000,"formatter":(value => nFormatter(value,1)),},
		"lines":[{"name":"costs","color":"#000000",}],};
	};

	let bar_total_cases = new BarPlot("total-cases",model_total_cases);
	let plot_cases = new LinePlot("cases-graph", model_cases);
	let bar_total_cost = new BarPlot("total-cost",model_total_cost);
	let plot_cost = new LinePlot("cost-graphs", model_cost);
    // $("#open").addClass("selected");

    $('#close').click((e) => {
        const target = $(e.target);
        $('.button').removeClass('selected');
        $(target).addClass('selected');
        nextActionR = 0.95;
    });
    $('#new-normal').click((e) => {
        const target = $(e.target);
        $('.button').removeClass('selected');
        $(target).addClass('selected');
        nextActionR = 1.0;
    });
    $('#open').click((e) => {
        const target = $(e.target);
        $('.button').removeClass('selected');
        $(target).addClass('selected');
        nextActionR = 1.08;
    });

    // Logic for running 1 time step:

    function stepSimulation() {
        const daysPerStep = 10;

        day += daysPerStep;
        if (day > 365) {
            clearInterval(interval); // game over after 365 days
        }

        env.step(nextActionR, daysPerStep);
    }

    function updateDisplay() {
        $('#day').html(day);

        const { history } = env;
        const resultObj = history[history.length - 1];

        const resultsDisplay = {
            infected_current: resultObj.num_infected,
            infected_total: sum(history.map((obj) => obj.num_infected)),

            deaths_current: resultObj.num_deaths,
            deaths_total: sum(history.map((obj) => obj.num_deaths)),

            cost_medical_current: resultObj.cost_medical,
            cost_medical_total: sum(history.map((obj) => obj.cost_medical)),

            cost_death_current: resultObj.cost_death,
            cost_death_total: sum(history.map((obj) => obj.cost_death)),

            cost_economic_current: resultObj.cost_economic,
            cost_economic_total: sum(history.map((obj) => obj.cost_economic)),

            cost_all_current: resultObj.cost_all,
            cost_all_total: sum(history.map((obj) => obj.cost_all))
        };
		
		bar_total_cases.appendValues([resultsDisplay.infected_total]);
		plot_cases.appendValues([resultsDisplay.infected_current]);
		bar_total_cost.appendValues([resultsDisplay.cost_all_total]);
		plot_cost.appendValues([resultsDisplay.cost_all_current]);

        const resultKeys = Object.keys(resultsDisplay);
        for (let i = 0; i < resultKeys.length; ++i) {
            const key = resultKeys[i];
            const quantity = resultsDisplay[key];
            let formatted = nFormatter(quantity, 1);
            if (key.indexOf('cost') > -1) {
                formatted = `$${formatted}`;
            }
            $(`#${key}`).html(formatted);
        }
    }

    function step() {
        stepSimulation();
        updateDisplay();
    }

    // Make "Start" button start the game, "Pause" button pause it.
    $('.start-pause').click((e) => {
        const target = $(e.target);
        if (target.hasClass('start')) {
            target.removeClass('start');
            target.addClass('pause');
            target.html('Pause');
            interval = setInterval(step, 2000);
        } else {
            target.removeClass('pause');
            target.addClass('start');
            target.html('Start');
            clearInterval(interval);
        }
    });

    // Run 1 step of game, just to display initial numbers
    $('#new-normal').click();
    updateDisplay();
}
