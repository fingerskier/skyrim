# Skyrim Helpers
**_This is bunch of tools to help w/ character usage/development_**

## Alchemy

```
function ingredientsForEffects(effects):
    results = []
    for each ingredient in ALL_INGREDIENTS:
        if ingredient.effects intersects effects:
            results.append(ingredient)
    return results
```

```
function possiblePotions(ingredientList):
    combos = []
    for each combination of 2 or 3 ingredients in ingredientList:
        shared = intersection of their effects
        if shared is not empty:
            combos.append({ingredients: combo, effects: shared})
    return combos
```

```
function potionValue(ingredients[], player, effectsRef, overrides):
    // 1) collect effects present in >=2 ingredients
    effectCounts = map<Effect,int>()
    perEffectIngredients = map<Effect, list<Ingredient>>()
    for ing in ingredients:
        for eff in ing.effects:
            effectCounts[eff] += 1
            perEffectIngredients[eff].append(ing)

    surviving = [eff for eff,count in effectCounts if count >= 2]
    if surviving is empty: return {valid:false, value:0, effects:[]}

    totalValue = 0
    effectsOut = []
    for eff in surviving:
        // 2) choose base mag/dur from strongest ingredient for this effect
        base = effectsRef[eff]
        best = base
        // apply any per-ingredient overrides if you track them
        for ing in perEffectIngredients[eff]:
            ov = overrides.get((ing.name, eff))
            if ov is strongerThan(best): best = merge(base, ov)

        // 3) compute scaled magnitude/duration + price contribution
        stats = effectStats(best, player)
        totalValue += stats.price
        effectsOut.append({effect: eff, magnitude: stats.magnitude, duration: stats.duration, price: stats.price})

    // 4) pick “dominant” effect for naming/type if you care
    dominant = argmax(effectsOut, by=price)

    return {valid:true, value: totalValue, dominant, effects: effectsOut}
```

You can select all ingredients that have on-hand, and the number of each of those.
You can also input player stats: alchemy skill, fortify alchemy %, alchemist perk level, physician perk level, benefactor perk level, poisoner perk level, seeker of shadows.
