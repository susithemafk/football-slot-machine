# poznamky - Fotbalový herní automat

react řeší HUD a tlačítka
pixijs herní plochu, animace
zustand řeší všechny stavy a je jediným zdrojem pravdy

## symboly a váhy

pole 3x3
4 různé symboly
váhy symbolů: 1, 2, 3, 4

## stavová logika

Stavy automatu:

- IDLE (čeká se na hráče),
- SPINNING (válce se točí),
- EVALUATING (vyhodnocuje se výhra/gól),
- WIN (zobrazení výhry)

## proměnné

- balance (peníze hráče),
- currentBet (aktuální sázka),
- lastWin (výhra v posledním kole)
