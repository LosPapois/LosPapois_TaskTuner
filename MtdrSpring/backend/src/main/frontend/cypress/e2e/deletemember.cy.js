describe('Eliminar miembro del proyecto', () => {

  beforeEach(() => {
    cy.visit('/')

    cy.get('input[type="email"]').type('pruebas@pruebas.com')
    cy.get('input[type="password"]').type('pruebas123')
    cy.get('form').submit()

    cy.url().should('include', '/home')
  })

  it('Elimina un miembro existente', () => {

    cy.get('main').contains('Cypress').click()

    cy.contains('Miembro Cypress 2').click()

    cy.contains('Completed').should('exist')

    cy.contains('Delete').click()

    cy.contains('Confirm Remove').click()

    cy.contains('Miembro Cypress 2').should('not.exist')
  })
})