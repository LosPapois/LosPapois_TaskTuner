describe('Crear Proyecto', () => {

  beforeEach(() => {
    cy.visit('/')

    cy.get('input[type="email"]').type('pruebas@pruebas.com')
    cy.get('input[type="password"]').type('pruebas123')
    cy.get('form').submit()

    cy.url().should('include', '/home')
  })

  it('Usuario puede crear un proyecto', () => {

    cy.contains('Add Project').click()

    cy.contains('Add New Project').should('be.visible')

    const unique = Date.now()

    cy.get('input').eq(0).type(`Proyecto ${unique}`)

    cy.get('input').eq(1).type('2026-05-01')

    cy.get('input').eq(2).type('2026-05-31')

    cy.contains('Create Project').click()

    cy.contains(`Proyecto ${unique}`).should('exist')

    cy.url().should('include', '/home')

  })

})