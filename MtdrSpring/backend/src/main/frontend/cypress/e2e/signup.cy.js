describe('Registro de usuario', () => {

  it('Usuario puede crear cuenta y es redirigido a login', () => {

    cy.visit('/')

    cy.contains("Create one").click()

    cy.url().should('include', '/signup')

    const unique = Date.now()

    cy.get('input').eq(0).type(`prueba${unique}`)
    cy.get('input').eq(1).type(`prueba${unique}@gmail.com`)
    cy.get('input').eq(2).type(`@prueba${unique}`)
    cy.get('input').eq(3).type('prueba123')

    cy.get('form').submit()

    cy.url().should('include', '/login')

  })

})