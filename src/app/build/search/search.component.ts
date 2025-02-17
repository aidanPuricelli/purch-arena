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

  @Input() selectedDeck: string = ''; // Receive selectedDeck from BuildComponent

  constructor( private http: HttpClient ) {}

  onSearch() {
      if (!this.searchQuery.trim()) {
          this.cardImages = [];
          return;
      }

      const apiUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(this.searchQuery)}`;

      this.http.get<any>(apiUrl).subscribe(response => {
          console.log('API Response:', response);
          if (response.data) {
              // Filter and map the response to only include the necessary fields
              this.cardImages = response.data
                  .filter((card: any) => card.image_uris?.normal)
                  .map((card: any) => ({
                      name: card.name,
                      mana_cost: card.mana_cost,
                      type_line: card.type_line,
                      image_uri: card.image_uris.normal
                  }));

              console.log('Filtered Images:', this.cardImages);
          }
      }, error => {
          console.error('Error fetching cards:', error);
          this.cardImages = [];
      });
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
