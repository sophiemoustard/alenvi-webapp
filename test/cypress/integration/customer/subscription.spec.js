const moment = require('moment');

describe('customers subscription tests', () => {
  beforeEach(() => {
    cy.request(`${Cypress.env('API_HOSTNAME')}/end-to-end/seed/billing`);
    cy.login({ email: 'helper@alenvi.io', password: '123456!eR' });
    cy.visit('/customers/subscriptions');
  });

  it('should display correctly the subscriptions part of the page', () => {
    cy.get('#q-app').click(500, 500);
    cy.get('[data-cy=subscriptions-table]').within(() => {
      cy.get('th').should('have.length', 6).and(($th) => {
        expect($th.eq(0)).to.have.text('Service');
        expect($th.eq(1)).to.have.text('Nature');
        expect($th.eq(2)).to.have.text('Prix unitaire TTC');
        expect($th.eq(3)).to.have.text('Volume hebdomadaire estimatif');
        expect($th.eq(4)).to.have.text('Coût hebdomadaire TTC *');
        expect($th.eq(5)).to.have.text('');
      });
    });

    cy.get('[data-cy=col-service]').should('contain', 'Service 1');
    cy.get('[data-cy=col-nature]').should('contain', 'Horaire');
    cy.get('[data-cy=col-unitTTCRate]').should('contain', '12.00€');
    cy.get('[data-cy=col-estimatedWeeklyVolume]').should('contain', '12h');
    cy.get('[data-cy=col-weeklyRate]').should('contain', '144.00€');
  });

  it('should interact correctly with the subscriptions part of the page', () => {
    cy.get('#q-app').click(500, 500);
    cy.get('.q-checkbox__inner').should('have.class', 'q-checkbox__inner--falsy');
    cy.get('.q-checkbox').click();
    cy.get('.q-checkbox__inner').should('have.class', 'q-checkbox__inner--truthy');
    cy.get('.q-checkbox').should('have.class', 'disabled');

    cy.get('[data-cy=agreement]').should(
      'contain',
      `(Accepté le ${moment().format('DD/MM/YYYY')} par Helper TEST)`
    );

    cy.get('[data-cy=show-subscription-history]').click();
    cy.get('[data-cy=subscriptions-history]').within(() => {
      cy.get('th').should('have.length', 5).and(($th) => {
        expect($th.eq(0)).to.have.text('Date de modification');
        expect($th.eq(1)).to.have.text('Prix unitaire TTC');
        expect($th.eq(2)).to.have.text('Volume hebdomadaire estimatif');
        expect($th.eq(3)).to.have.text('dont soirées');
        expect($th.eq(4)).to.have.text('dont dimanche');
      });

      cy.get('[data-cy=col-createdAt]').eq(0).should('contain', '01/01/2020');
      cy.get('[data-cy=col-unitTTCRate]').eq(0).should('contain', '12.00€');
      cy.get('[data-cy=col-estimatedWeeklyVolume]').eq(0).should('contain', '12h');
      cy.get('[data-cy=col-evenings]').eq(0).should('contain', '2');
      cy.get('[data-cy=col-sundays]').eq(0).should('contain', '1');

      cy.get('[data-cy=col-createdAt]').eq(1).should('contain', '01/06/2019');
      cy.get('[data-cy=col-unitTTCRate]').eq(1).should('contain', '10.00€');
      cy.get('[data-cy=col-estimatedWeeklyVolume]').eq(1).should('contain', '8h');
      cy.get('[data-cy=col-evenings]').eq(1).should('contain', '');
      cy.get('[data-cy=col-sundays]').eq(1).should('contain', '2');
    });

    cy.get('[data-cy=close-modal]').click();

    cy.get('[data-cy=show-fundings-history]').click();
    cy.get('[data-cy=fundings-history]').within(() => {
      cy.get('[data-cy=col-startDate]').should('contain', 'Date de début de prise en charge');
      cy.get('[data-cy=col-thirdPartyPayer]').should('contain', 'Tiers payeur');
      cy.get('[data-cy=col-folderNumber]').should('contain', 'Numéro de dossier');
      cy.get('[data-cy=col-frequency]').should('contain', 'Fréquence');
      cy.get('[data-cy=col-amountTTC]').should('contain', 'Montant forfaitaire TTC');
      cy.get('[data-cy=col-customerParticipationRate]').should('contain', 'Tx. participation bénéficiaire');

      cy.get('[data-cy=col-side-startDate]').should('contain', '02/02/2020');
      cy.get('[data-cy=col-side-thirdPartyPayer]').should('contain', 'Toto');
      cy.get('[data-cy=col-side-folderNumber]').should('contain', 'D123456');
      cy.get('[data-cy=col-side-frequency]').should('contain', 'Une seule fois');
      cy.get('[data-cy=col-side-amountTTC]').should('contain', '1600€');
      cy.get('[data-cy=col-side-customerParticipationRate]').should('contain', '66%');
    });
  });

  it('should display correctly the payment part and open the modal for the mandate', () => {
    cy.get('#q-app').click(500, 500);

    cy.get('[data-cy=bank-account-owner]').should('have.value', 'David gaudu');
    cy.get('[data-cy=iban]').should('have.value', 'FR3617569000306699167186M11');
    cy.get('[data-cy=bic]').should('have.value', 'ABNAFRPP');

    cy.get('[data-cy=mandate-table]').within(() => {
      cy.get('th').should('have.length', 2).and(($th) => {
        expect($th.eq(0)).to.have.text('RUM');
        expect($th.eq(1)).to.have.text('Signature');
      });
    });

    cy.server();
    cy.route('POST', '/customers/*/mandates/*/esign').as('esign');

    cy.get('[data-cy=open-mandate]').click();
    cy.wait('@esign').should((xhr) => {
      expect(xhr.request.body.customer).to.deep.equal({
        name: 'Bardet',
        email: 'helper@alenvi.io',
      });
      expect(xhr.request.body.fields).to.deep.equal({
        bankAccountOwner: 'David gaudu',
        customerAddress: '12 rue de ponthieu 75008 Paris',
        ics: '9876',
        rum: 'R012345678903456789',
        bic: 'ABNAFRPP',
        iban: 'FR3617569000306699167186M11',
        companyName: 'Test SAS',
        companyAddress: '37 rue de Ponthieu 75008 Paris',
        downloadDate: Cypress.moment().format('DD/MM/YYYY'),
      });
    });

    cy.get('iframe');
    cy.get('[data-cy=esign-modal]').should('be.visible');
  });
});
