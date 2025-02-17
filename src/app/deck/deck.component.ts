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

  sortCriteria: string = '';

  noInputError = false;
  fadeOutError = false;
  showError = false;

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

    window.addEventListener('addCardToDeck', (event: any) => {
      this.addToDeck(event.detail);
    });
  }

 // Track input changes
  onInputChange(): void {
    this.noInputError = false;
    this.fadeOutError = false;
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
    this.http.get<{ deck: any[] }>(`/api/deck/${deckName}`).subscribe(
      (response) => {
        this.deck = response.deck || [];
  
        this.http.get<{ commander: any }>(`/api/deck/${deckName}/commander`).subscribe(
          (commanderResponse) => {
            if (commanderResponse.commander) {
              this.deck.unshift(commanderResponse.commander);
            }
            this.deckCount = this.deck.length;
            this.cdr.detectChanges();
          },
          (error) => {
            console.warn('No commander found for this deck.');
            this.deckCount = this.deck.length;
            this.cdr.detectChanges();
          }
        );
      },
      (error) => console.error('Error loading deck:', error)
    );
  }

  // sort by parameter
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
  
    this.cdr.detectChanges();
  }
  
  // extract card type (update needed to work for artifact creatures)
  extractMainType(typeLine: string): string {
    if (!typeLine) return 'Unknown';
  
    const typeParts = typeLine.split('—')[0].trim().split(' ');
    const mainType = typeParts.find(type => !['Legendary', 'Basic', 'Snow', 'Token'].includes(type));
  
    return mainType || 'Unknown';
  }

  // extract mana cost
  extractNumericManaCost(manaCost: string): number {
    if (!manaCost) return 0; 
  
    const numericPart = manaCost.match(/\d+/g); // Extract numbers
    const coloredMana = manaCost.match(/[WUBRGC]/g); // Extract letters
  
    const numericValue = numericPart ? numericPart.map(Number).reduce((sum, val) => sum + val, 0) : 0;
    const coloredCount = coloredMana ? coloredMana.length : 0;
  
    return numericValue + coloredCount; 
  }
  
  // Create a new deck
  createDeck(): void {
    if (!this.newDeckName.trim()) {
      this.noInputError = true;
      this.showError = true;
  
      setTimeout(() => {
        this.fadeOutError = true;
      }, 3000);
  
      setTimeout(() => {
        this.showError = false;
        this.fadeOutError = false;
        this.noInputError = false;
      }, 3500);
  
      return;
    }

    this.http.post('/api/deck', { deckName: this.newDeckName }).subscribe(
      () => {
        this.loadDeckNames();
        this.selectedDeck = this.newDeckName;
        this.loadDeck(this.newDeckName);
        console.log(`Deck "${this.newDeckName}" created and selected`);

        this.newDeckName = '';
      },
      (error) => console.error('Error creating deck', error)
    );
  }

  // add card to deck
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

    this.deckSelectedFlag = false;

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

    const cardIndex = this.deck.findIndex(card => card === this.selectedCard);
    if (cardIndex === -1) {
      console.warn('Selected card not found in deck.');
      return;
    }
    const [commanderCard] = this.deck.splice(cardIndex, 1);

    this.http.post(`/api/deck/${this.selectedDeck}`, { newCards: [], removedCards: [commanderCard] }).subscribe(
      () => {
        this.http.post(`/api/deck/${this.selectedDeck}/commander`, { commander: commanderCard }).subscribe(
          () => {
            alert(`Commander set to ${commanderCard.name}`);
            this.loadDeck(this.selectedDeck);
          },
          (error) => {
            console.error('Error setting commander:', error);
            alert('Failed to set commander.');
          }
        );
      },
      (error) => {
        console.error('Error updating deck:', error);
        alert('Failed to update deck after setting commander.');
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
  
        event.target.value = '';
      },
      (error) => {
        console.error('Error importing deck:', error);
        alert('Failed to import deck.');

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
