import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; 
import { provideAnimations } from '@angular/platform-browser/animations';  
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),   
    provideAnimations(),  
    provideHttpClient(withInterceptors([authInterceptor])) ,
    { provide: LOCALE_ID, useValue: 'fr' },         
  ]
};