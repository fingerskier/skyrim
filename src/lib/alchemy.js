// Utility functions for alchemy calculations

// Return ingredients that have at least one of the selected effects
export function ingredientsForEffects(selectedEffects, allIngredients) {
  return allIngredients.filter(ing =>
    ing.effects.some(eff => selectedEffects.includes(eff)),
  );
}

// Generate all valid potions from a list of ingredients
export function possiblePotions(ingredientList) {
  const combos = [];
  for (let i = 0; i < ingredientList.length; i++) {
    for (let j = i + 1; j < ingredientList.length; j++) {
      const sharedTwo = intersect(ingredientList[i].effects, ingredientList[j].effects);
      if (sharedTwo.length) {
        combos.push({
          ingredients: [ingredientList[i].name, ingredientList[j].name],
          effects: sharedTwo,
        });
      }
      for (let k = j + 1; k < ingredientList.length; k++) {
        const sharedThree = intersect(sharedTwo, ingredientList[k].effects);
        if (sharedThree.length) {
          combos.push({
            ingredients: [
              ingredientList[i].name,
              ingredientList[j].name,
              ingredientList[k].name,
            ],
            effects: sharedThree,
          });
        }
      }
    }
  }
  return combos;
}

function intersect(a, b) {
  return a.filter(x => b.includes(x));
}
