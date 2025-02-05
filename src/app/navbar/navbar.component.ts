import { Component, Input } from '@angular/core';
import { SearchService } from '../services/search.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  @Input() links: { text: string, href?: string, action?: () => void }[] = [];

  constructor(private searchService: SearchService) {}

  toggleSearch() {
    this.searchService.toggleSearch();
  }
}
