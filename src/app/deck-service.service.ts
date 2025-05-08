import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DeckService {

  constructor(private http: HttpClient) { }

  loadDeckNames(deckNames: string[]): void {
    this.http.get<{ deckNames: string[] }>('/api/decks').subscribe(
      (response) => {
        // Clear the array and push new values
        deckNames.length = 0;
        deckNames.push(...response.deckNames);
        console.log('Available Decks:', deckNames);
      },
      (error) => console.error('Error loading deck names', error)
    );
  }

  loadDeck(deckName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.http.get<{ deck: any[] }>(`/api/deck/${deckName}`).subscribe(
        (response) => {
          resolve(response.deck || []);
        },
        (error) => {
          console.error('Error loading deck:', error);
          reject(error);
        }
      );
    });
  }

  loadCommander(deckName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.get<{ commander: any }>(`/api/deck/${deckName}/commander`).subscribe(
        (response) => {
          resolve(response.commander || null);
        },
        (error) => {
          console.warn('No commander found for this deck.');
          resolve(null);
        }
      );
    });
  }

  // todo: complete implementation and replace call in deck.component.ts
  createDeck(deckName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post('/api/deck', { deckName: deckName }).subscribe(
        () => {
       
        },
        (error) => console.error('Error creating deck', error)
      );
    });
  }
}
