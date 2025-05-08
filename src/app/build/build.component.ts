import { Component, HostListener, ViewChild } from '@angular/core';
import { DeckComponent } from '../deck/deck.component';
import { SearchComponent } from './search/search.component';

@Component({
  selector: 'app-build',
  templateUrl: './build.component.html',
  styleUrls: ['./build.component.css']
})
export class BuildComponent {
  @ViewChild(DeckComponent) deckComponent!: DeckComponent;
  @ViewChild(SearchComponent) searchComponent!: SearchComponent;

  searchFlag = false;
  selectedDeck = '';
  insightsVisible = false;
  settingsVisible = false;
  deckName: string = '';
  addCardFlag = false;
  toggleSearch() {
    this.searchFlag = !this.searchFlag;
    if(this.addCardFlag) {
      this.addCardFlag = false;
    }
  }

  onAddDeck() {
    this.deckComponent.createDeck(this.deckName);
  }

  onDeleteDeck() {
    // todo: delete deck
  }

  onDeckSelected(deckName: string) {
    this.selectedDeck = deckName;
  }

  toggleInsights() {
    this.insightsVisible = !this.insightsVisible;
  }

  toggleSettings() {
    this.settingsVisible = !this.settingsVisible;
  }

  downloadDeck() {
    this.deckComponent.downloadDeck();
  }

  importDeck(event: Event) {
    this.deckComponent.importDeck(event);
  }

  importDeckFromText(event: Event) {
    this.deckComponent.importDeckFromText(event);
  }

  toggleAddCard() {
    this.addCardFlag = !this.addCardFlag;
    if(this.searchFlag) {
      this.searchFlag = false;
    }
  }

  // todo: remove settings dropdown when clicking outside of it
  // @HostListener('document:click')
  // onDocumentClick(): void {
  //   this.settingsVisible = false;
  // }
}
