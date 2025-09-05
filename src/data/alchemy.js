import rawIngredients from '../assets/alchemy_ingredients.json';
import rawEffects from '../assets/alchemy_effects.json';
import rawIngredientEffects from '../assets/alchemy_ingredient_effects.json';

const effects = rawEffects.map(e => ({
  id: Number(e.id),
  name: e['\ufeffname'] || e.name,
}));

const ingredients = rawIngredients.map(i => ({
  id: Number(i.id),
  name: i['\ufeffIngredient'] || i.Ingredient,
  weight: Number(i.weight),
}));

const ingredientEffects = rawIngredientEffects.map(ie => ({
  ingredientId: Number(ie['\ufeffingredient_id'] || ie.ingredient_id),
  effectId: Number(ie.effect_id),
}));

const effectsById = Object.fromEntries(effects.map(e => [e.id, e.name]));

const ingredientsWithEffects = ingredients.map(ing => ({
  ...ing,
  effects: ingredientEffects
    .filter(ie => ie.ingredientId === ing.id)
    .map(ie => effectsById[ie.effectId])
    .sort(),
}));

export { ingredientsWithEffects as ingredients, effects };
