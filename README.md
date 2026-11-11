# Prompt — Modern Credit Management Dashboard (MVP Prototype)

## Project Overview

Create a modern, clean, intuitive, and professional **Credit Sales Management Dashboard** for an optical retail store.

The application will replace an outdated Excel-based workflow currently used to manage customer credit sales, installment payments, overdue balances, and payment records.

> **IMPORTANT:** This is a UI/UX prototype for an MVP, NOT a production-ready application.

The primary goal is to create a visually polished, functional-looking prototype that can be presented to the store owner and employees for validation and feedback.

Do not implement a backend, database, authentication, or external API integrations. Use realistic static mock data throughout the application.

Use the attached screenshots as references:

- The existing Excel spreadsheet represents the current workflow and the type of information being managed.
- The dashboard example represents the desired layout, organization, search functionality, and overall user experience.

Do not reproduce the visual style of the spreadsheet. Redesign it into a modern application.

## 1. Design Direction

Build a premium, modern SaaS-style dashboard inspired by clean financial management platforms.

The design should be:

- Modern, minimalistic, and professional.
- Clean and spacious, with excellent visual hierarchy.
- Easy to understand for non-technical retail employees.
- Focused on usability, readability, and efficiency.
- Visually consistent across all modules.
- Responsive, but primarily optimized for desktop usage.

### Visual Style

- Light theme by default.
- Soft off-white or very light gray page background.
- White cards and table containers.
- Subtle borders and soft shadows.
- Rounded corners (approximately 10–14px).
- Modern typography such as Inter.
- A restrained primary accent color, preferably indigo or blue.
- Green for successful payments.
- Red for overdue payments.
- Amber for pending payments.
- Subtle hover states and smooth transitions.
- Clean Lucide icons or equivalent.

Avoid excessive gradients, glassmorphism, heavy shadows, oversized elements, and unnecessary decorations.

The result should look like a professional financial management application, not a basic HTML table.

All user-facing interface text must be written in **Brazilian Portuguese (pt-BR)**.

- **Currency:** BRL (R$).
- **Date format:** DD/MM/YYYY.

## 2. Main Application Layout

Create a consistent dashboard layout with three primary sections:

### A. Left Sidebar Navigation

Create a fixed or collapsible vertical sidebar.

At the top, display a simple application identity:

**Crediário Fácil**

Use a minimal logo or icon related to financial management.

Include the following navigation modules:

1. **Visão Geral** — Dashboard overview.
2. **Vendas** — Credit sales management.
3. **Clientes** — Customer management.
4. **Parcelas** — Installment tracking.
5. **Relatórios** — Financial summaries.
6. **Configurações** — Placeholder settings page.

Each navigation item should include:

- A corresponding icon.
- A readable label.
- A clear active state.
- Subtle hover effects.

At the bottom of the sidebar, display a small static user profile, such as "Administrador", and a settings shortcut.

Navigation must work between the prototype screens, but no real business logic or backend is required.

### B. Top Header With Search Bar

Create a clean top navigation header spanning the main content area.

The most important element is a **prominent global search bar**, positioned above the page content, similar to the search example in the reference.

Search placeholder:

> Buscar cliente, CPF ou venda...

Requirements:

- Rounded search input.
- Search icon on the left.
- Comfortable width and padding.
- Visually prominent but not oversized.
- Clean border and focus state.
- Optional notification and user avatar icons on the right.

The search bar should remain consistently positioned across all pages.

For the prototype, implement basic frontend-only filtering of mock customers or sales, especially on the sales listing page.

### C. Main Content Area

The central area must display the currently selected module.

Use a consistent structure:

- Page title.
- Short subtitle.
- Primary action button.
- Summary cards when relevant.
- Filters.
- Main content table or cards.

Maintain generous spacing and strong visual hierarchy.

## 3. Sales Management Page — Primary Screen

**This is the most important page of the entire prototype.**

The store currently uses Excel to register credit sales and track installments.

Create a modern table-based interface that makes this process substantially easier to visualize.

### Page Header

Title: **Vendas**

Subtitle: "Gerencie vendas parceladas e acompanhe os pagamentos dos clientes."

Primary action button:

**+ Nova venda**

### Summary Cards

Above the table, display four compact financial summary cards:

1. **Total em aberto** — Total remaining balance.
2. **Valores em atraso** — Total overdue amount.
3. **Recebido no mês** — Payments received this month.
4. **Vendas cadastradas** — Number of registered sales.

Use mock values and appropriate icons.

### Sales Table

Create a modern, professional, readable data table with the following columns:

| Column            | Description                               |
| ----------------- | ----------------------------------------- |
| Cliente           | Customer name, with subtle initials avatar |
| Data da venda     | Sale registration date                    |
| Valor total       | Total sale amount                         |
| Parcelas          | Paid installments / total installments    |
| Saldo devedor     | Remaining unpaid amount                   |
| Próximo vencimento | Next unpaid installment due date          |
| Situação          | Visual status badge                       |
| Ações             | View, edit, and more options               |

Status examples:

- **Em dia** — Green or neutral success indicator.
- **Atrasada** — Red indicator.
- **Quitada** — Green indicator.

Design requirements:

- White table container with rounded corners.
- Subtle row separators.
- Comfortable cell padding.
- Readable typography.
- Clear column alignment.
- Currency values aligned consistently.
- Status displayed as minimal colored pills.
- Hover effects on table rows.
- Action menu using three dots.
- Optional pagination at the bottom.

Use at least 10–15 realistic Brazilian mock sales records.

### Search and Filters

Above the table, add a compact filter toolbar.

Include:

- Customer search.
- Status filter: Todas, Em dia, Atrasadas, Quitadas.
- Date filter.
- Clear filters action.

The search in the top header may share the same mock search state as the table, or the page-specific search may be omitted to avoid unnecessary duplication.

Make the existing search and basic status filtering work with local mock data.

## 4. Sale Details and Installments

When the user clicks on a sale, open a polished sale details page or side drawer.

Display:

### Customer Information

- Nome completo
- CPF
- Telefone

### Sale Information

- Data da venda
- Valor total
- Quantidade de parcelas
- Total pago
- Saldo devedor
- Situação geral

### Installments Table

Show the installments belonging to that sale.

Columns:

- Parcela (e.g., 1/6)
- Valor
- Vencimento
- Situação
- Data do pagamento
- Forma de pagamento
- Ações

Statuses:

- Paga
- Pendente
- Vencida

Display paid installments in green, overdue installments in red, and pending installments in amber or neutral tones.

Include a visually clear action button:

**Registrar pagamento**

Clicking this button should open a mock payment registration modal containing:

- Valor recebido
- Data do pagamento
- Forma de pagamento
- Confirmar pagamento

The interaction can simulate success using local frontend state. No data persistence is required.

## 5. Customers Page

Create a customer management screen.

Title: **Clientes**

Subtitle: "Consulte e organize os clientes cadastrados."

Include:

- Search input.
- **Novo cliente** button.
- Customers table.

Columns:

- Nome
- CPF
- Telefone
- Vendas cadastradas
- Saldo em aberto
- Situação
- Ações

Clicking a customer should display a customer details screen with their basic information and associated credit sales.

Use static mock data.

## 6. Installments Page

Create a dedicated installment tracking module.

Title: **Parcelas**

Subtitle: "Acompanhe pagamentos pendentes, realizados e vencidos."

Include summary cards or quick filters:

- Todas
- Pendentes
- Vencidas
- Pagas

Table columns:

- Cliente
- Venda
- Parcela
- Valor
- Vencimento
- Situação
- Ações

Make overdue installments especially easy to identify without making the interface visually overwhelming.

Provide local mock interactions for registering a payment.

## 7. Dashboard Overview

Create a clean overview page accessible through **Visão Geral**.

Include:

- Total outstanding balance.
- Total overdue balance.
- Payments received this month.
- Number of active customers.
- Recent sales.
- Upcoming installment due dates.
- Overdue payments requiring attention.

Optionally include a simple chart displaying payments received over recent months.

The dashboard should prioritize useful financial information instead of decorative charts.

## 8. Reports Page

Create a basic static financial reports page.

Include mock report cards or charts for:

- Recebimentos mensais.
- Valores em aberto.
- Parcelas vencidas.
- Vendas realizadas por período.

Include an "Exportar relatório" button as a visual placeholder.

No actual reporting engine or file generation is necessary.

## 9. Forms and Modals

Create visually consistent prototype forms for:

- Cadastrar cliente.
- Cadastrar venda.
- Editar venda.
- Registrar pagamento.

For the new sale form, include:

- Cliente.
- Data da venda.
- Valor total.
- Quantidade de parcelas.
- Primeiro vencimento.
- Observações.

Display a simple simulated installment preview based on the entered sale amount and number of installments.

Frontend-only calculations are allowed.

All forms should be clean, well-spaced, and easy for non-technical users to understand.

No backend integration is needed.

## 10. Mock Data and Interactions

Use realistic mock data in Brazilian Portuguese.

Examples:

- Maria Oliveira.
- João Pereira.
- Ana Souza.
- Carlos Ferreira.
- Juliana Martins.

Include varying sale values, installment quantities, due dates, and statuses.

All mock data must be clearly separated from UI components so that it can later be replaced with API responses.

For the prototype, implement lightweight local interactions where useful:

- Sidebar navigation.
- Global search.
- Status filters.
- Opening sale details.
- Opening customer details.
- Opening registration modals.
- Simulating a payment registration.
- Closing modals.
- Displaying mock confirmation messages.

These interactions should make the application feel realistic during a client presentation.

Do not implement authentication, backend endpoints, database access, or external API calls.

## 11. Code Structure and Implementation

First, inspect the existing project structure and identify the frontend framework and styling approach.

Preserve the existing technology stack whenever possible.

If this is an Angular project, prefer:

- Standalone components.
- Modern Angular template syntax.
- Signals for local UI state.
- Reusable components.
- TailwindCSS for styling, if already configured or appropriate.
- Feature-based organization.

Recommended reusable UI components:

- `AppSidebar`
- `AppHeader`
- `PageHeader`
- `SummaryCard`
- `DataTable`
- `StatusBadge`
- `SearchInput`
- `FilterToolbar`
- `SaleDetails`
- `PaymentModal`
- `CustomerForm`
- `SaleForm`

Use mock services or local TypeScript data files where appropriate.

Avoid unnecessary architectural complexity.

Do not install large UI component frameworks unless truly necessary.

Focus on clean, maintainable frontend code.

## 12. User Experience Requirements

Remember that the main users are retail employees who currently work with Excel.

The UI should be immediately understandable even without technical experience.

Prioritize:

1. Finding a customer quickly.
2. Identifying outstanding installments.
3. Registering a payment with very few clicks.
4. Viewing overdue installments clearly.
5. Understanding the overall financial situation.

Avoid complicated navigation, excessive menus, or overly dense tables.

Ensure that important actions are visible and easy to access.

## 13. Prototype Scope and Priorities

This is a **visual MVP prototype for stakeholder validation**.

Do not spend time implementing infrastructure that is unnecessary for a demonstration.

Focus development effort in this priority order:

1. Main application shell with sidebar and top search bar.
2. Sales listing page with a polished table.
3. Sale details and installment tracking.
4. Customers page.
5. Dashboard overview.
6. Installments page.
7. Basic reports and settings placeholders.
8. Frontend-only modal interactions.

Every page should be navigable and visually consistent.

It is better to deliver a highly polished, coherent interface with realistic mock data than to build unnecessary backend features.

## 14. Expected Final Result

Deliver a complete, navigable frontend prototype that feels like a real financial management SaaS application.

The prototype must demonstrate how the store could move from a complex Excel spreadsheet to a modern and intuitive credit sales management system.

The result should be suitable for presentation to the store owner and employees, helping validate:

- Whether the proposed layout is understandable.
- Whether customer and sale information is easy to locate.
- Whether payment management is simpler than using Excel.
- Whether the proposed navigation and modules match their daily workflow.

**The most important requirement is a beautiful, modern, clean, and highly usable Sales Management screen with a left navigation sidebar, a top search bar, and a central customer sales listing.**

Build the actual frontend prototype in the existing project rather than only describing the design.
