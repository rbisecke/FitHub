interface Props {
  category: string;
}

export function EmptyCategoryState({ category }: Props) {
  return (
    <p className="text-xs text-zinc-600 font-mono py-8 text-center px-4">
      No records yet in this category.
      <br />
      Log a workout with a [{category}] movement to set your first tag.
    </p>
  );
}
