import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from '../app/app.config';
import { PaginacaoFixture } from './paginacao-fixture';

bootstrapApplication(PaginacaoFixture, appConfig).catch((err) => console.error(err));
