import { Component, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent {
  searchQuery: string = '';
  cardImages: any[] = [];
  contextMenuVisible: boolean = false;
  menuX: number = 0;
  menuY: number = 0;
  selectedCard: any | null = null;
  errorMessage: string = '';

  @Input() selectedDeck: string = ''; // Receive selectedDeck from BuildComponent

  constructor(private http: HttpClient) {}

  onSearch() {
      if (!this.searchQuery.trim()) {
          this.cardImages = [];
          return;
      }

      const apiUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(this.searchQuery)}`;

      // Fetch cards from Scryfall
      this.http.get<any>(apiUrl).subscribe(response => {
          console.log('API Response:', response);
          let scryfallCards = [];
          if (response.data) {
              // Filter and map the response to only include the necessary fields
              scryfallCards = response.data
              .filter((card: any) => card.image_uris?.normal)
              .map((card: any) => ({
                  id: card.id, // Ensure ID is included
                  name: card.name,
                  mana_cost: card.mana_cost,
                  type_line: card.type_line,
                  image_uri: card.image_uris.normal
              }));          
              console.log('Filtered Scryfall Cards:', scryfallCards);
          }
          // Set the cardImages to Scryfall results and then fetch custom cards
          this.cardImages = scryfallCards;
          this.searchCustomCards();
      }, error => {
          console.error('Error fetching Scryfall cards:', error);
          this.cardImages = [];
          // Even if Scryfall fails, still try to fetch custom cards
          this.searchCustomCards();
      });
  }

  // New function to fetch and filter custom cards
  searchCustomCards() {
      this.http.get<any[]>(`/api/custom-cards`).subscribe(customCards => {
          // Filter custom cards based on the search query (ignoring case)
          const filteredCustomCards = customCards.filter((card: any) =>
                card.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            ).map((card: any) => ({
                id: card.id || this.generateCustomCardId(card), // Ensure an ID exists
                name: card.name,
                mana_cost: card.mana_cost,
                type_line: card.type_line,
                image_uri: card.image_uri
            }));
        
          console.log('Filtered Custom Cards:', filteredCustomCards);
          // Append the custom cards to the existing cardImages array
          this.cardImages = [...this.cardImages, ...filteredCustomCards];
      }, error => {
          console.error('Error fetching custom cards:', error);
      });
  }

  generateCustomCardId(card: any): string {
    return `${card.name}-${Date.now()}`;
  }


  onRightClick(event: MouseEvent, card?: any) {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.menuX = event.clientX;
    this.menuY = event.clientY;
    this.selectedCard = card || null;
  }

  hideContextMenu() {
    this.contextMenuVisible = false;
  }

  saveImage() {
      if (!this.selectedDeck) {
          console.warn('⚠️ No deck selected. Cannot add card.');
          return;
      }

      if (this.selectedCard) {
          // Ensure only the necessary fields are sent when saving
          const cardToSave = {
            id: this.selectedCard.id || this.generateCustomCardId(this.selectedCard),
            name: this.selectedCard.name,
            mana_cost: this.selectedCard.mana_cost,
            type_line: this.selectedCard.type_line,
            image_uri: this.selectedCard.image_uri
        };
        

          console.log(`Saving card to deck '${this.selectedDeck}':`, cardToSave);

          window.dispatchEvent(new CustomEvent('addCardToDeck', { detail: cardToSave }));

          this.http.post(`/api/deck/${this.selectedDeck}`, { newCards: [cardToSave], removedCards: [] }).subscribe(
              (response) => {
                  console.log(`Card added to deck '${this.selectedDeck}':`, response);
              },
              (error) => console.error('Error adding card to deck', error)
          );
      }
      this.hideContextMenu();
  }
}