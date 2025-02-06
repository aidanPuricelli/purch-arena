import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-deck',
  templateUrl: './deck.component.html',
  styleUrls: ['./deck.component.css']
})
export class DeckComponent implements OnInit {
  @Input() selectedDeck: string = ''; // Receive selectedDeck from BuildComponent
  @Output() deckSelected: EventEmitter<string> = new EventEmitter<string>(); // Emit deck selection

  deckNames: string[] = [];
  deck: any[] = [];
  savedDeck: any[] = [];
  newDeckName: string = ''; // Property for new deck creation

  // Context Menu Properties
  contextMenuVisible: boolean = false;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  selectedCard: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadDeckNames();

    // Listen for external events to add cards
    window.addEventListener('addCardToDeck', (event: any) => {
      this.addToDeck(event.detail);
    });
  }

  // Load all deck names
  loadDeckNames(): void {
    this.http.get<{ deckNames: string[] }>('/api/decks').subscribe(
      (response) => {
        this.deckNames = response.deckNames;
        console.log('📜 Available Decks:', this.deckNames);
      },
      (error) => console.error('❌ Error loading deck names', error)
    );
  }

  // Load the selected deck and notify BuildComponent
  loadDeck(deckName: string): void {
    if (!deckName) {
      console.warn('⚠️ No deck name provided.');
      return;
    }

    this.selectedDeck = deckName;
    this.deckSelected.emit(deckName);
    console.log(`📌 Selected deck set to: '${this.selectedDeck}'`);

    this.http.get<{ deck: any[] }>(`/api/deck/${deckName}`).subscribe(
      (response) => {
        console.log(`📥 Loaded deck '${deckName}':`, response.deck);
        this.deck = response.deck || [];
      },
      (error) => console.error('❌ Error loading deck', error)
    );
  }

  // Create a new deck
  createDeck(): void {
    if (!this.newDeckName.trim()) return;

    this.http.post('/api/deck', { deckName: this.newDeckName }).subscribe(
      () => {
        this.loadDeckNames();
        this.loadDeck(this.newDeckName);
        console.log(`✅ Deck "${this.newDeckName}" created`);
        this.newDeckName = ''; // Clear input field after creation
      },
      (error) => console.error('❌ Error creating deck', error)
    );
  }

  addToDeck(card: any) {
    this.deck.push(card);
  }

  

  // Remove a card from the selected deck and immediately update the backend
  removeCard(): void {
    if (!this.selectedCard) return;

    console.log(`🗑️ Removing card from '${this.selectedDeck}':`, this.selectedCard);
    
    const index = this.deck.findIndex(card => card.id === this.selectedCard.id);
    if (index !== -1) {
      this.deck.splice(index, 1);
      
      // Send updated deck to backend
      this.http.post(`/api/deck/${this.selectedDeck}`, { newCards: [], removedCards: [this.selectedCard] }).subscribe(
        (response) => {
          console.log(`✅ Card removed from deck '${this.selectedDeck}':`, response);
        },
        (error) => console.error('❌ Error removing card from deck', error)
      );
    }

    this.contextMenuVisible = false;
    this.selectedCard = null;
  }

  // Right-click context menu for card removal
  onRightClick(event: MouseEvent, card: any): void {
    event.preventDefault();
    this.selectedCard = card;
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuVisible = true;
  }

    // Delete a deck
  deleteDeck(): void {
    if (!this.selectedDeck) return;

    this.http.delete(`/api/deck/${this.selectedDeck}`).subscribe(
      () => {
        console.log(`🗑️ Deck "${this.selectedDeck}" deleted`);
        this.selectedDeck = '';
        this.deck = [];
        this.savedDeck = [];
        this.loadDeckNames();
      },
      (error) => console.error('❌ Error deleting deck', error)
    );
  }

  setCommander(): void {
    if (!this.selectedCard) {
      console.warn('⚠️ No card selected to set as commander.');
      return;
    }
  
    if (!this.selectedDeck) {
      console.warn('⚠️ No deck selected. Cannot set commander.');
      return;
    }
  
    console.log(`👑 Setting commander for '${this.selectedDeck}':`, this.selectedCard);
  
    this.http.post(`/api/deck/${this.selectedDeck}/commander`, { commander: this.selectedCard }).subscribe(
      (response) => {
        console.log(`✅ Commander set for '${this.selectedDeck}':`, response);
        alert(`Commander set to ${this.selectedCard.name}`);
      },
      (error) => {
        console.error('❌ Error setting commander', error);
        alert('Failed to set commander. Please try again.');
      }
    );
  
    this.contextMenuVisible = false;
    this.selectedCard = null;
  }
  
  

  @HostListener('document:click')
  onDocumentClick(): void {
    this.contextMenuVisible = false;
  }
}
