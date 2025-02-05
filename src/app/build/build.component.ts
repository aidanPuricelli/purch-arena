import { Component } from '@angular/core';
import { SearchService } from '../services/search.service'; // Import SearchService

@Component({
  selector: 'app-build',
  templateUrl: './build.component.html',
  styleUrls: ['./build.component.css']
})
export class BuildComponent {
  constructor(private searchService: SearchService) {}

  navLinks = [
    { text: 'Home', href: '/' }
  ];

  toggleSearch() {
    this.searchService.toggleSearch();
  }
}
