# Calculation Rules

## Rules philosophy
All totals must be derived from a single central calculation layer.

## Cost item model
Each cost item should include:
- id
- scenario_id
- category
- name
- pricing_type
- source_type
- status
- unit_price
- quantity
- formula_key
- included_in_package
- override_value
- calculated_total
- final_total

## Pricing types
- fixed
- per_guest
- per_child
- per_room
- conditional
- manual

## Source types
- venue_offer
- vendor_quote
- manual_estimate
- actual
- derived

## Status types
- estimated
- quoted
- booked
- deposit_paid
- partially_paid
- paid
- cancelled

## Pałac Goetz pricing logic from current offer
- menu_full_price = 655 PLN per guest
- open_bar = 225 PLN per guest
- bartender_fee = 2000 PLN if guest_count < 100 and open_bar enabled
- hall_lighting = 8500 PLN fixed when enabled
- room_with_breakfast = 650 PLN per room, offer indicates min 25 rooms in sample
- organizational_cost = min((100 - guest_count) * 350, 8750) for smaller receptions where applicable
- logistic minimum for Saturdays and holidays = 75 guests

## Reference totals from attached offer
- 50 guests: total 79,500 PLN; deposit 15,900 PLN; remaining 63,600 PLN
- 75 guests: total 101,500 PLN; deposit 20,300 PLN; remaining 81,200 PLN
- 100 guests: total 112,750 PLN; deposit 22,550 PLN; remaining 90,200 PLN

## Important calculation rules
- Never add sweet table, cold buffet, hot buffet, standard drinks again if already included in the menu package.
- Optional items must be excluded until enabled.
- Scenario comparison must show both venue-only total and all-in wedding total.
- Children should not automatically inherit adult menu pricing.
- All currency values stored as integers in grosze or cents-safe numeric format.
