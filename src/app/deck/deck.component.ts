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
  newDeckName: string = '';

  isLoading: boolean = false;

  showSettings = false;
  isSettingsDisabled: boolean = true;

  deckSelectedFlag = false;

  contextMenuVisible: boolean = false;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  selectedCard: any = null;

  deckCount = this.deck.length;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadDeckNames();

    this.isSettingsDisabled = !this.selectedDeck;

    // Listen for adding cards
    window.addEventListener('addCardToDeck', (event: any) => {
      this.addToDeck(event.detail);
    });
  }

  // Load all deck names
  loadDeckNames(): void {
    this.http.get<{ deckNames: string[] }>('/api/decks').subscribe(
      (response) => {
        this.deckNames = response.deckNames;
        console.log('Available Decks:', this.deckNames);
      },
      (error) => console.error('Error loading deck names', error)
    );
  }

  // Load the selected deck 
  loadDeck(deckName: string): void {
    this.deckSelectedFlag = true;

    this.isSettingsDisabled = false;

    if (!deckName) {
      return;
    }

    this.selectedDeck = deckName;
    this.deckSelected.emit(deckName);
    console.log(`Selected deck set to: '${this.selectedDeck}'`);

    this.http.get<{ deck: any[] }>(`/api/deck/${deckName}`).subscribe(
      (response) => {
        console.log(`Loaded deck '${deckName}':`, response.deck);
        this.deck = response.deck || [];
        this.deckCount = this.deck.length;
        this.cdr.detectChanges();
      },
      (error) => console.error('Error loading deck', error)
    );
  }

  sortCriteria: string = '';

  sortBy(parameter: string) {
    if (!this.deck || this.deck.length === 0) return;
  
    switch (parameter) {
      case 'type':
        this.deck.sort((a, b) => {
          const typeA = this.extractMainType(a.type_line);
          const typeB = this.extractMainType(b.type_line);
          return typeA.localeCompare(typeB);
        });
        break;
  
      case 'manaCost':
        this.deck.sort((a, b) => this.extractNumericManaCost(b.mana_cost) - this.extractNumericManaCost(a.mana_cost));
        break;
  
      default:
        console.warn('Invalid sorting parameter:', parameter);
    }
  
    this.cdr.detectChanges(); // Ensure UI updates
  }
  
  

  extractMainType(typeLine: string): string {
    if (!typeLine) return 'Unknown';
  
    // Remove supertypes (Legendary, Basic, Snow, etc.)
    const typeParts = typeLine.split('—')[0].trim().split(' ');
    const mainType = typeParts.find(type => !['Legendary', 'Basic', 'Snow', 'Token'].includes(type));
  
    return mainType || 'Unknown'; // Default to 'Unknown' if not found
  }

  extractNumericManaCost(manaCost: string): number {
    if (!manaCost) return 0; // Default to 0 if no mana cost
  
    const numericPart = manaCost.match(/\d+/g); // Extract numbers (e.g., "3" from "{3}{W}{U}{B}")
    const coloredMana = manaCost.match(/[WUBRGC]/g); // Extract letters (colored mana symbols)
  
    const numericValue = numericPart ? numericPart.map(Number).reduce((sum, val) => sum + val, 0) : 0;
    const coloredCount = coloredMana ? coloredMana.length : 0;
  
    return numericValue + coloredCount; // Sum numeric and colored mana costs
  }
  
  
  
  
  

  // Create a new deck
  createDeck(): void {
    if (!this.newDeckName.trim()) return;

    this.http.post('/api/deck', { deckName: this.newDeckName }).subscribe(
      () => {
        this.loadDeckNames();
        this.loadDeck(this.newDeckName);
        console.log(`Deck "${this.newDeckName}" created`);
        this.newDeckName = '';
      },
      (error) => console.error('Error creating deck', error)
    );
  }

  addToDeck(card: any) {
    this.deck.push(card);
    this.deckCount = this.deck.length;
  }

  

  // Remove a card 
  removeCard(): void {
    if (!this.selectedCard) return;

    console.log(`Removing card from '${this.selectedDeck}':`, this.selectedCard);
    
    const index = this.deck.findIndex(card => card.id === this.selectedCard.id);
    if (index !== -1) {
      this.deck.splice(index, 1);
      
      this.http.post(`/api/deck/${this.selectedDeck}`, { newCards: [], removedCards: [this.selectedCard] }).subscribe(
        (response) => {
          console.log(`Card removed from deck '${this.selectedDeck}':`, response);
        },
        (error) => console.error('Error removing card from deck', error)
      );
    }

    this.deckCount = this.deck.length;
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

    this.isSettingsDisabled = true;

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

  // Set Commander
  setCommander(): void {
    if (!this.selectedCard) {
      console.warn('No card selected to set as commander.');
      return;
    }
  
    if (!this.selectedDeck) {
      console.warn('No deck selected. Cannot set commander.');
      return;
    }
  
    console.log(`Setting commander for '${this.selectedDeck}':`, this.selectedCard);
  
    this.http.post(`/api/deck/${this.selectedDeck}/commander`, { commander: this.selectedCard }).subscribe(
      (response) => {
        console.log(`Commander set for '${this.selectedDeck}':`, response);
        alert(`Commander set to ${this.selectedCard.name}`);
      },
      (error) => {
        console.error('Error setting commander', error);
        alert('Failed to set commander. Please try again.');
      }
    );
  
    this.contextMenuVisible = false;
    this.selectedCard = null;
  }

  // Method to download a single deck
  downloadDeck(): void {
    if (!this.selectedDeck) {
      alert('No deck selected to download.');
      return;
    }

    const url = `/api/deck/${this.selectedDeck}/download`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.selectedDeck}.json`;
    link.click();
  }

  // Method to import a single deck
  importDeck(event: any): void {
    if (!this.selectedDeck) {
      alert('Please select a deck before importing.');
      return;
    }
  
    const file = event.target.files[0];
    if (!file) {
      alert('No file selected.');
      return;
    }
  
    const formData = new FormData();
    formData.append('file', file);
  
    this.http.post(`/api/deck/${this.selectedDeck}/import`, formData).subscribe(
      (response) => {
        console.log(response);
        alert(`Deck "${this.selectedDeck}" imported successfully.`);
        this.loadDeck(this.selectedDeck);
  
        // Reset the file input after successful upload
        event.target.value = '';
      },
      (error) => {
        console.error('Error importing deck:', error);
        alert('Failed to import deck.');
        // Reset the file input even if the import fails
        event.target.value = '';
      }
    );
  }

  // import deck from text file (e.g. from archidekt)
  importDeckFromText(event: any): void {
    if (!this.selectedDeck) {
      alert('Please select a deck before importing.');
      return;
    }
  
    const file = event.target.files[0];
    if (!file) {
      alert('No file selected.');
      return;
    }

    this.isLoading = true;
  
    const formData = new FormData();
    formData.append('file', file);
  
    this.http.post(`/api/deck/${this.selectedDeck}/import-text`, formData).subscribe(
      (response) => {
        console.log(response);
        alert(`Deck "${this.selectedDeck}" imported from text file successfully.`);
        this.loadDeck(this.selectedDeck);
  
        // Reset the file input after successful upload
        this.isLoading = false;
        event.target.value = '';
      },
      (error) => {
        console.error('Error importing deck from text:', error);
        alert('Failed to import deck from text.');
        event.target.value = '';
      }
    );
  }  
  
  

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }
  

  
  
  @HostListener('document:click')
  onDocumentClick(): void {
    this.contextMenuVisible = false;
  }
}
