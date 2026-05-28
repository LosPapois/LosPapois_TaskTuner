describe('Agregar miembro - Add Existing User', () => {

  beforeEach(() => {
    cy.visit('/')

    cy.get('input[type="email"]').type('pruebas@pruebas.com')
    cy.get('input[type="password"]').type('pruebas123')
    cy.get('form').submit()

    cy.url().should('include', '/home')
  })

  it('Agrega un usuario existente al proyecto', () => {

    cy.contains('div', 'Cypress').click()

    cy.wait(1000)


    cy.get('main')
      .contains('Cypress')
      .click()

    cy.contains('Add Team Member')
      .scrollIntoView()
      .click()

    cy.contains('Add Existing User').click()

    cy.get('input').type('Miembro Cypress')

    cy.get('select')
      .should('be.visible')
      .select('Miembro Cypress')

    cy.contains('Add User').click()

    cy.contains('Miembro Cypress')
      .should('exist')
  })
})