import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomePageComponent } from './home-page/home-page.component';
import { NavbarComponent } from './navbar/navbar.component';
import { BuildComponent } from './build/build.component';
import { SearchComponent } from './build/search/search.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DeckComponent } from './deck/deck.component';
import { PlayComponent } from './play/play.component';
import { CreateComponent } from './create/create.component';
import { QuickStartComponent } from './quick-start/quick-start.component';
import { ReleaseNotesComponent } from './release-notes/release-notes.component';
import { DeckAnalysisComponent } from './deck-analysis/deck-analysis.component';

@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    NavbarComponent,
    BuildComponent,
    SearchComponent,
    DeckComponent,
    PlayComponent,
    CreateComponent,
    QuickStartComponent,
    ReleaseNotesComponent,
    DeckAnalysisComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [
    provideClientHydration()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
