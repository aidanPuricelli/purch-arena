import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
  showSettings = false;
  showSaveModal = false;
  savedStates: string[] = [];
  selectedSavedState: string = '';

  constructor(private http: HttpClient) {}

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  // Download Single JSON File
  downloadFile(fileName: string): void {
    const link = document.createElement('a');
    link.href = `/api/download/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadBoth(): void {
    this.downloadFile('decks.json');
    setTimeout(() => this.downloadFile('commander.json'), 500);
  }

  // Upload JSON File
  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    this.http.post('/api/upload', formData).subscribe({
      next: () => alert(`${file.name} uploaded successfully!`),
      error: (err) => alert(`Error uploading file: ${err.error.message}`)
    });

    input.value = '';
  }

  // Hide settings if user clicks outside of dropdown
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.settings-dropdown');
    const settingsIcon = document.querySelector('.settings-icon');

    if (
      this.showSettings &&
      dropdown &&
      !dropdown.contains(target) &&
      settingsIcon &&
      !settingsIcon.contains(target)
    ) {
      this.showSettings = false;
    }
  }

  // Open modal for managing saved games
  openSaveModal() {
    this.showSaveModal = true;
    this.fetchSavedStates();
  }

  closeSaveModal() {
    this.showSaveModal = false;
  }

  // Fetch saved states from server and remove .json extensions
  fetchSavedStates() {
    fetch('/api/saved-states')
      .then(response => response.json())
      .then(data => {
        if (data.savedStates) {
          // Remove .json extension from each state name
          this.savedStates = data.savedStates.map((state: string) => state.replace(/\.json$/, ''));
        }
      })
      .catch(error => {
        console.error('Error fetching saved states:', error);
        alert('Failed to retrieve saved states.');
      });
  }

  // Delete the selected game save
  deleteSelectedState() {
    if (!this.selectedSavedState) {
      alert('Please select a saved state to delete.');
      return;
    }

    const fileName = this.selectedSavedState;

    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return;
    }

    fetch(`/api/delete-game/${fileName}`, {
      method: 'DELETE'
    })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          alert(data.message);
          // Remove deleted state from savedStates array
          this.savedStates = this.savedStates.filter(state => state !== fileName);
          this.selectedSavedState = '';
        } else {
          alert('Failed to delete the selected save.');
        }
      })
      .catch(error => {
        console.error('Error deleting save:', error);
        alert('Failed to delete the selected save.');
      });
  }

}
