describe('Agregar miembro - Create New Member', () => {

  beforeEach(() => {
    cy.visit('/')

    cy.get('input[type="email"]').type('pruebas@pruebas.com')
    cy.get('input[type="password"]').type('pruebas123')
    cy.get('form').submit()

    cy.url().should('include', '/home')
  })

  it('Agrega un nuevo miembro al proyecto', () => {


    cy.get('main').contains('Cypress').click()

    cy.wait(1000)

    cy.contains('Add Team Member').scrollIntoView().should('be.visible').click()


    cy.get('input').eq(0).type('Miembro Cypress')
    cy.get('input').eq(1).type('@miembrocypress')
    cy.get('input').eq(2).type('miembro@test.com')

    cy.contains('Create Member').click()

    cy.contains('Miembro Cypress').should('exist')
  })
})