Cypress.Commands.overwrite('log', (subject, message) => cy.task('log', message));
