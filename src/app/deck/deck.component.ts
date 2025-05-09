import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardInfoService } from '../card-info.service';

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
  currentCommander: any = null;

  placeIndex = 0;
  deckPlaceHolderList = ['Sen Tr...', 'Edgar Ma...', 'Tergri...', 'Grand Arbit...']
  deckPlaceHolder = this.deckPlaceHolderList[this.placeIndex];

  isLoading: boolean = false;

  sortCriteria: string = '';

  noInputError = false;
  fadeOutError = false;
  showError = false;

  showSettings = false;
  isSettingsDisabled: boolean = true;

  deckSelectedFlag = false;

  selectedCard: any = null;

  deckCount = this.deck.length;

  constructor(private http: HttpClient, 
              private cdr: ChangeDetectorRef,
              private cardInfoService: CardInfoService) {}

  ngOnInit() {
    this.loadDeckNames();

    this.isSettingsDisabled = !this.selectedDeck;

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
    this.selectedDeck = deckName;
    this.deckSelected.emit(deckName);

    this.deckSelectedFlag = true;
    this.isSettingsDisabled = false;

    this.cdr.detectChanges();

    this.http.get<{ deck: any[] }>(`/api/deck/${deckName}`).subscribe(
      (response) => {
        this.deck = response.deck || [];
  
        this.http.get<{ commander: any }>(`/api/deck/${deckName}/commander`).subscribe(
          (commanderResponse) => {
            if (commanderResponse.commander) {
              this.currentCommander = commanderResponse.commander;
              // Remove any existing commander from the deck
              this.deck = this.deck.filter(card => 
                !(card.name === commanderResponse.commander.name && 
                  card.image_uri === commanderResponse.commander.image_uri)
              );
              // Add commander to the front
              this.deck.unshift(commanderResponse.commander);
            } else {
              this.currentCommander = null;
            }
            this.deckCount = this.deck.length;
            this.cdr.detectChanges();
          },
          (error) => {
            console.warn('No commander found for this deck.');
            this.currentCommander = null;
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
          const typeA = this.cardInfoService.extractMainType(a.type_line);
          const typeB = this.cardInfoService.extractMainType(b.type_line);
          return typeA.localeCompare(typeB);
        });
        break;
  
      case 'manaCost':
        this.deck.sort((a, b) => this.cardInfoService.extractNumericManaCost(b.mana_cost) - this.cardInfoService.extractNumericManaCost(a.mana_cost));
        break;
  
      default:
        console.warn('Invalid sorting parameter:', parameter);
    }
  
    this.cdr.detectChanges();
  }
  
  // Create a new deck
  createDeck(deckName: string): void {
    this.http.post('/api/deck', { deckName: deckName }).subscribe(
      () => {
        this.loadDeckNames();

        this.selectedDeck = deckName;
        this.deckSelected.emit(this.selectedDeck);

        this.loadDeck(deckName);
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
  removeCard(card: any): void {
    if (!card) return;
  
    console.log('Attempting to remove card:', card);
    console.log('Current deck:', this.deck);
  
    // Find the exact card in the deck
    const index = this.deck.findIndex(c => {
      const isMatch = c.name === card.name && 
                     c.image_uri === card.image_uri &&
                     c.oracle_id === card.oracle_id;  // Add oracle_id check for more precise matching
      console.log('Comparing cards:', {
        deckCard: c,
        clickedCard: card,
        isMatch
      });
      return isMatch;
    });
    
    console.log('Found index:', index);
    
    if (index !== -1) {
      const removedCard = this.deck.splice(index, 1)[0];
      console.log('Removed card:', removedCard);
      
      // Log the exact card being sent to the server
      console.log('Sending to server for removal:', removedCard);
      
      this.http.post(`/api/deck/${this.selectedDeck}`, { newCards: [], removedCards: [removedCard] }).subscribe(
        (response) => {
          console.log(`Card removed from deck '${this.selectedDeck}':`, response);
        },
        (error) => console.error('Error removing card from deck', error)
      );
  
      this.deckCount = this.deck.length;
    } else {
      console.warn('Selected card not found in deck.');
    }
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
  setCommander(card: any): void {
    if (!card) {
      console.warn('No card selected to set as commander.');
      return;
    }

    if (!this.selectedDeck) {
      console.warn('No deck selected. Cannot set commander.');
      return;
    }

    const cardIndex = this.deck.findIndex(c => c.name === card.name && c.image_uri === card.image_uri);
    if (cardIndex === -1) {
      console.warn('Selected card not found in deck.');
      return;
    }
    const [commanderCard] = this.deck.splice(cardIndex, 1);

    this.http.post(`/api/deck/${this.selectedDeck}`, { newCards: [], removedCards: [commanderCard] }).subscribe(
      () => {
        this.http.post(`/api/deck/${this.selectedDeck}/commander`, { commander: commanderCard }).subscribe(
          () => {
            this.currentCommander = commanderCard;
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
}