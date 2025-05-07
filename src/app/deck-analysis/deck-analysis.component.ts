import { HttpClient } from '@angular/common/http';
import { Component, Input, Output, EventEmitter, ChangeDetectorRef, OnInit } from '@angular/core';
import { DeckService } from '../deck-service.service';
import { Chart, registerables, ChartOptions } from 'chart.js';
import { CardInfoService } from '../card-info.service';

Chart.register(...registerables);

@Component({
  selector: 'app-deck-analysis',
  templateUrl: './deck-analysis.component.html',
  styleUrl: './deck-analysis.component.css'
})
export class DeckAnalysisComponent implements OnInit {
  selectedDeck: string = '';

  deckNames: string[] = [];
  // could be useful later for disabling settings when no deck is selected
  settingsFlag: boolean = true;
  deckSelectedFlag = false;
  deck: any[] = [];
  deckCount = 0;
  selectedDeckName = '';

  // Pie Chart data
  chartData = {
    labels: ['Creatures', 'Instants', 'Sorceries', 'Enchantments', 'Artifacts', 'Lands'],
    datasets: [{
      data: [20, 10, 10, 10, 10, 30],
      backgroundColor: [
        '#8a5128',  // Brown
        '#2c3e50',  // Dark Blue
        '#27ae60',  // Green
        '#c0392b',  // Red
        '#f39c12',   // Orange
        '#94618e'    // Purple
      ],
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };

  // Mana Curve data
  manaCurveData = {
    labels: ['0', '1', '2', '3', '4', '5', '6+'],
    datasets: [{
      label: 'Cards',
      data: [5, 12, 15, 10, 8, 6, 4],
      backgroundColor: [
        '#8a5128',  // Brown
        '#2c3e50',  // Dark Blue
        '#27ae60',  // Green
        '#c0392b',  // Red
        '#f39c12',  // Orange
        '#94618e',  // Purple
        '#3498db'   // Light Blue
      ],
      borderColor: '#ffffff',
      borderWidth: 1
    }]
  };

  chartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#8a5128',
          font: {
            family: 'Beleren',
            size: 14
          }
        }
      },
      title: {
        display: true,
        text: 'Card Types',
        color: '#8a5128',
        font: {
          family: 'Beleren',
          size: 16
        }
      }
    }
  };

  manaCurveOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Mana Curve',
        color: 'rgb(107, 90, 82)',
        font: {
          family: 'Beleren',
          size: 16
        }
      }
    },
    scales: {
      y: {
        display: false
      },
      x: {
        ticks: {
          color: '#8a5128',
          font: {
            family: 'Beleren',
            size: 12
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  pieChart: Chart | undefined;
  manaCurveChart: Chart | undefined;

  constructor(private cdr: ChangeDetectorRef,
              private deckService: DeckService,
              private cardInfoService: CardInfoService) {}

  ngOnInit() {
    console.log('DeckAnalysisComponent initialized');
    this.loadDeckNames();
    this.settingsFlag = !this.selectedDeck;
    this.initializeCharts();
  }

  private initializeCharts() {
    const pieCtx = document.getElementById('deckPieChart') as HTMLCanvasElement;
    if (pieCtx) {
      this.pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: this.chartData,
        options: this.chartOptions
      });
    }

    // Initialize Bar Chart
    const barCtx = document.getElementById('manaCurveChart') as HTMLCanvasElement;
    if (barCtx) {
      this.manaCurveChart = new Chart(barCtx, {
        type: 'bar',
        data: this.manaCurveData,
        options: this.manaCurveOptions
      });
    }
  }

  loadDeckNames(): void {
    console.log('Loading deck names');
    this.deckService.loadDeckNames(this.deckNames);
  }

  // Load the selected deck 
  async loadDeck(deckName: string): Promise<void> {
    this.selectedDeck = deckName;
    this.deckSelectedFlag = true;
    this.settingsFlag = false;

    try {
      this.deck = await this.deckService.loadDeck(deckName);
      const commander = await this.deckService.loadCommander(deckName);
      
      if (commander) {
        this.deck.unshift(commander);
      }
      
      this.deckCount = this.deck.length;
      this.initPieChart();
      this.initManaCurve();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading deck:', error);
    }
  }

  initPieChart() {
    // Reset data before recounting
    this.chartData.datasets[0].data = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < this.deck.length; i++) {
      const card = this.deck[i];
      const cardType = this.cardInfoService.extractMainType(card.type_line);
      if (cardType === 'Creature') {
        this.chartData.datasets[0].data[0]++;
      } else if (cardType === 'Instant') {
        this.chartData.datasets[0].data[1]++;
      } else if (cardType === 'Sorcery') {
        this.chartData.datasets[0].data[2]++;
      } else if (cardType === 'Enchantment') {
        this.chartData.datasets[0].data[3]++;
      } else if (cardType === 'Artifact') {
        this.chartData.datasets[0].data[4]++;
      } else if (cardType === 'Land') {
        this.chartData.datasets[0].data[5]++;
      }
    }
    // Update the chart
    if (this.pieChart) {
      this.pieChart.update();
    }
  }

  initManaCurve() {
    // Reset data before recounting
    this.manaCurveData.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < this.deck.length; i++) {
      const card = this.deck[i];
      const mainType = this.cardInfoService.extractMainType(card.type_line);
      if (mainType === 'Land') continue; // Skip lands

      const manaCost = this.cardInfoService.extractNumericManaCost(card.mana_cost);
      // Place into the correct bucket: 0, 1, 2, 3, 4, 5, 6+
      if (manaCost === 0) {
        this.manaCurveData.datasets[0].data[0]++;
      } else if (manaCost === 1) {
        this.manaCurveData.datasets[0].data[1]++;
      } else if (manaCost === 2) {
        this.manaCurveData.datasets[0].data[2]++;
      } else if (manaCost === 3) {
        this.manaCurveData.datasets[0].data[3]++;
      } else if (manaCost === 4) {
        this.manaCurveData.datasets[0].data[4]++;
      } else if (manaCost === 5) {
        this.manaCurveData.datasets[0].data[5]++;
      } else if (manaCost >= 6) {
        this.manaCurveData.datasets[0].data[6]++;
      }
    }

    // Update the chart
    if (this.manaCurveChart) {
      this.manaCurveChart.update();
    }
  }
}
