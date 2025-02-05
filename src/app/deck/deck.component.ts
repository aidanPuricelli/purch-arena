import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-deck',
  templateUrl: './deck.component.html',
  styleUrls: ['./deck.component.css']
})
export class DeckComponent implements OnInit {
  // Current deck cards (includes both saved and newly added)
  deck: any[] = [];
  // Deck as originally loaded from deck.json
  savedDeck: any[] = [];

  // For the custom context menu
  contextMenuVisible: boolean = false;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  selectedCard: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Load the deck from the server (deck.json) on component init
    this.loadDeckFromServer();

    // Listen for external events to add cards
    window.addEventListener('addCardToDeck', (event: any) => {
      this.addToDeck(event.detail);
    });
  }

  addToDeck(card: any) {
    this.deck.push(card);
    console.log('Deck updated:', this.deck);
  }

  /**
   * Save deck method sends only new cards (not already in deck.json)
   * and removed cards based on the differences between the current deck and the saved deck.
   * This version supports multiple copies of the same card.
   */
  saveDeck(): void {
    // Build count objects for the current deck and saved deck.
    const currentCounts: { [id: string]: number } = {};
    const savedCounts: { [id: string]: number } = {};

    this.deck.forEach(card => {
      currentCounts[card.id] = (currentCounts[card.id] || 0) + 1;
    });
    this.savedDeck.forEach(card => {
      savedCounts[card.id] = (savedCounts[card.id] || 0) + 1;
    });

    // Determine newCards: extra copies in the current deck beyond what is in savedDeck.
    const newCards: any[] = [];
    const countsUsed: { [id: string]: number } = {};
    for (const card of this.deck) {
      countsUsed[card.id] = (countsUsed[card.id] || 0) + 1;
      const savedCount = savedCounts[card.id] || 0;
      // If this copy exceeds what was originally saved, consider it new.
      if (countsUsed[card.id] > savedCount) {
        newCards.push(card);
      }
    }

    // Determine removedCards: copies that existed in savedDeck but are no longer in the current deck.
    const removedCards: any[] = [];
    const removedCountsUsed: { [id: string]: number } = {};
    for (const card of this.savedDeck) {
      removedCountsUsed[card.id] = (removedCountsUsed[card.id] || 0) + 1;
      const currentCount = currentCounts[card.id] || 0;
      // If more copies were saved than currently exist, mark one as removed.
      if (removedCountsUsed[card.id] > currentCount) {
        removedCards.push(card);
      }
    }

    // If there are no changes, nothing needs to be sent.
    if (newCards.length === 0 && removedCards.length === 0) {
      console.log('No changes to save.');
      return;
    }

    this.http.post('/api/deck', { newCards, removedCards }).subscribe(
      (response) => {
        console.log('Deck saved successfully', response);
        // After a successful save, update savedDeck to match the current deck.
        this.savedDeck = this.deck.slice(); // Make a shallow copy
      },
      (error) => {
        console.error('Error saving deck', error);
      }
    );
  }

  // Load the deck from the server (deck.json)
  loadDeckFromServer(): void {
    this.http.get<{ deck: any[] }>('/api/deck').subscribe(
      (response) => {
        this.deck = response.deck;
        // Save a copy of the originally loaded deck
        this.savedDeck = response.deck.slice();
        console.log('Deck loaded from server:', this.deck);
      },
      (error) => {
        console.error('Error loading deck from server', error);
      }
    );
  }

  // Optional: A method to load a deck from a local JSON file (if needed)
  loadDeck(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (!result) return;
  
      try {
        const json = JSON.parse(result as string);
        this.deck = json;
        // Optionally update savedDeck if you want to treat the loaded file as saved data:
        // this.savedDeck = json.slice();
      } catch (error) {
        console.error('Invalid JSON file', error);
      }
    };
    reader.readAsText(file);
  }

  // Handler for right-click (contextmenu) event on a card
  onRightClick(event: MouseEvent, card: any): void {
    event.preventDefault(); // Prevent the default browser context menu
    this.selectedCard = card;
    // Get the mouse position to display the menu at that location
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuVisible = true;
  }

  // Method to remove the selected card from the deck
  removeCard(): void {
    if (this.selectedCard) {
      const index = this.deck.indexOf(this.selectedCard);
      if (index !== -1) {
        this.deck.splice(index, 1);
        console.log('Card removed:', this.selectedCard);
      }
      // Hide the context menu after removal
      this.contextMenuVisible = false;
      this.selectedCard = null;
    }
  }

  // Hide the context menu if user clicks anywhere else on the document
  @HostListener('document:click')
  onDocumentClick(): void {
    this.contextMenuVisible = false;
  }
}
