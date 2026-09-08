# Review Comment Generator Design

## Goal

Add a compact, customizable rent-review sentence generator at the top of the Review Comments tab.

## Inputs and Output

The generator has an optional new-rent field, start date, tenancy type, and conditionally visible fixed-term fields.

- When a new rent is entered, the sentence begins `Rent increased to $[amount] from [start date].`
- When rent is blank, it begins `Rent remains the same` and does not invent a price.
- A fixed term adds `with a [term] fixed term until [end date].`
- A periodic tenancy adds `Tenancy continuing as periodic.` and hides fixed-term inputs.
- Dates use the local short form `D MMM YYYY`.

## Scope

This is a client-side helper. It does not persist values and does not replace the three fixed reference cards below it.

## Verification

Pure sentence-generation tests cover rent increase, rent unchanged, fixed term, periodic tenancy, and date formatting. A production build confirms the form integrates with the existing Templates page.
