import { queryTypes, useQueryState, useQueryStates } from "next-usequerystate";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { themeChange } from "theme-change";

enum Algorithm {
  RANDOM = "random",
  FAIREST = "fairest",
  MINPICKUPS = "minimum pickups",
}

type Item = {
  name: string;
  claimedBy: null | string;
};

type Person = {
  name: string;
  items: string[];
};

type ItemAssignment = {
  item: string;
  assignee: string;
};

const themes = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
];

export default function Home() {
  const router = useRouter();
  const [hydrateUiFromQueryParams, setShouldHydrateUiFromQueryParams] =
    useState(false);
  const [canRunLottery, setCanRunLottery] = useState(false);
  const [itemAssignments, setItemAssignments] = useState<
    ItemAssignment[] | undefined
  >(undefined);

  const [{ items, people }, setItemsAndPeople] = useQueryStates({
    items: queryTypes
      .array(queryTypes.json<Item>())
      .withDefault([{ name: "", claimedBy: null }]),
    people: queryTypes
      .array(queryTypes.json<Person>())
      .withDefault([{ name: "", items: [] }]),
  });

  const [algorithm, setAlgorithm] = useQueryState(
    "algorithm",
    queryTypes
      .stringEnum(Object.values(Algorithm))
      .withDefault(Algorithm.FAIREST)
  );

  const onItemTextChange = (index: number) => (e: any) => {
    const newItems = [...items];
    newItems[index].name = e.target.value;
    setItemsAndPeople(
      { people, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  const onAddItem = () => {
    setItemsAndPeople(
      { people, items: [...items, { name: "", claimedBy: null }] },
      { scroll: false, shallow: true }
    );
  };

  const onItemAssigneeChange = (index: number) => (e: any) => {
    const newItems = [...items];
    newItems[index].claimedBy = e.target.value;
    setItemsAndPeople(
      { people, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  const onDelItem = (index: number) => () => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItemsAndPeople(
      { people, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  const onClearAllItemClaims = () => {
    const newItems = [...items];
    newItems.forEach((item) => {
      item.claimedBy = null;
    });
    setItemsAndPeople(
      { people, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  const onPersonNameChange = (index: number) => (e: any) => {
    const newPeople = [...people];
    newPeople[index].name = e.target.value;
    setItemsAndPeople(
      { items, people: newPeople },
      { scroll: false, shallow: true }
    );
  };

  const onPersonItemsChange = (index: number, item: string) => (e: any) => {
    const newPeople = [...people];
    if (e.target.checked) {
      newPeople[index].items = [...newPeople[index].items, item];
    } else {
      newPeople[index].items = newPeople[index].items.filter((p) => p !== item);
    }
    setItemsAndPeople(
      { items, people: newPeople },
      { scroll: false, shallow: true }
    );
  };

  const onAddPerson = () => {
    setItemsAndPeople(
      { items, people: [...people, { name: "", items: [] }] },
      {
        scroll: false,
        shallow: true,
      }
    );
  };

  const onDelPerson = (index: number) => () => {
    const newPeople = [...people];
    newPeople.splice(index, 1);
    setItemsAndPeople(
      { items, people: newPeople },
      { scroll: false, shallow: true }
    );
  };

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const clearAll = () => {
    setItemsAndPeople(
      {
        items: [{ name: "", claimedBy: null }],
        people: [{ name: "", items: [] }],
      },
      { scroll: false, shallow: true }
    );
    setItemAssignments(undefined);
  };

  const runLottery = () => {
    const newItems: Item[] = [];
    items.forEach((item) => {
      if (
        newItems.find((i) => i.name === item.name) === undefined &&
        item.name !== ""
      ) {
        newItems.push(item);
      }
    });

    const newPeople: Person[] = [];
    people.forEach((person) => {
      if (person.name !== "") {
        const newItems: string[] = [];
        person.items.forEach((item) => {
          if (newItems.indexOf(item) < 0) {
            newItems.push(item);
          }
        });
        newPeople.push({ name: person.name, items: newItems });
      }
    });

    const itemAssignments = (() => {
      switch (algorithm) {
        case Algorithm.RANDOM:
          return randomItemAssignment(newItems, newPeople);
        case Algorithm.FAIREST:
          return maxScoredAssignment(newItems, newPeople, [
            minimizeGiniCoefficient,
          ]);
        case Algorithm.MINPICKUPS:
          return maxScoredAssignment(newItems, newPeople, [
            minimizeNumPickups,
            minimizeGiniCoefficient,
          ]);
      }
    })();

    setItemsAndPeople(
      { people: newPeople, items: newItems },
      { scroll: false, shallow: true }
    );
    setItemAssignments(itemAssignments);
  };

  const setItemClaims = () => {
    const newItems = [...items];
    itemAssignments?.forEach((itemAssignment) => {
      const item = newItems.find((i) => i.name === itemAssignment.item);
      if (item) {
        item.claimedBy = itemAssignment.assignee;
      }
    });
    setItemsAndPeople(
      { people, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  useEffect(() => {
    setShouldHydrateUiFromQueryParams(true);
  }, []);

  useEffect(() => {
    // Scoll to bottom
    if (itemAssignments) window.scrollTo(0, document.body.scrollHeight);
  }, [itemAssignments]);

  useEffect(() => {
    // Scroll to last item
    document
      .getElementById(`item-${items.length - 1}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [items.length]);

  useEffect(() => {
    // Scroll to last person
    document
      .getElementById(`person-${people.length - 1}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [people.length]);

  useEffect(() => {
    setCanRunLottery(
      items.find((i) => i.name !== "") !== undefined &&
        people.filter(
          (p) =>
            p.name !== "" &&
            p.items.find(
              (item) => items.find((i) => i.name === item) !== undefined
            ) !== undefined
        ).length > 0
    );
  }, [people, items]);

  useEffect(() => {
    if (!router.isReady || !hydrateUiFromQueryParams) {
      return;
    }
    themeChange(false);
    if (document.documentElement.getAttribute("data-theme") === null) {
      document.documentElement.setAttribute("data-theme", themes[0]);
    }
  }, [router.isReady, hydrateUiFromQueryParams]);

  if (!router.isReady || !hydrateUiFromQueryParams) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex flex-col p-4">
        <div className="flex justify-between">
          <button className="btn" onClick={copyUrlToClipboard}>
            Copy URL
          </button>
          <button className="btn" onClick={clearAll}>
            Clear data
          </button>
          <select
            data-choose-theme
            defaultValue={themes[0]}
            className="select select-bordered"
          >
            {themes.map((theme, themeIdx) => (
              <option key={`theme${themeIdx}`} value={theme}>
                {theme.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <h1 className="text-2xl font-bold mt-4">Items</h1>
        <div className="card mt-4">
          {items.map((item, idx) => (
            <div
              id={`item-${idx}`}
              key={`item-${idx}`}
              className="card card-bordered bg-base-100 mb-4 p-4"
            >
              <div className="flex flex-row items-center">
                <div className="form-control w-full">
                  <label className="input-group">
                    <span>Item {idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Item..."
                      className="input input-bordered"
                      value={item.name}
                      onChange={onItemTextChange(idx)}
                    />
                  </label>
                </div>
                {(idx > 0 || items.length > 1) && (
                  <DeleteButton onClick={onDelItem(idx)} />
                )}
              </div>
              <select
                className="select select-bordered w-full mt-4"
                value={item.claimedBy || ""}
                onChange={onItemAssigneeChange(idx)}
              >
                <option value="">Not claimed</option>
                {people
                  .filter((p) => p.name !== "")
                  .map((person, personIdx) => (
                    <option key={`person${personIdx}`} value={person.name}>
                      {person.name}
                    </option>
                  ))}
              </select>
            </div>
          ))}
          <AddButton onClick={onAddItem}>Add item</AddButton>
          {items.find((i) => people.find((p) => p.name === i.claimedBy)) && (
            <button className="btn mt-4" onClick={onClearAllItemClaims}>
              Clear all claims
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold mt-4">People</h1>
        <div className="card mt-4">
          {people.map((person, personIdx) => (
            <div
              id={`person-${personIdx}`}
              key={`person-${personIdx}`}
              className="card bg-base-100 mb-4 card-bordered p-4"
            >
              <div className="flex flex-row items-center ">
                <div className="form-control w-full">
                  <label className="input-group">
                    <span>Person {personIdx + 1}</span>
                    <input
                      type="text"
                      placeholder="Name..."
                      className="input input-bordered"
                      value={person.name}
                      onChange={onPersonNameChange(personIdx)}
                    />
                  </label>
                </div>
                {(personIdx > 0 || people.length > 1) && (
                  <DeleteButton onClick={onDelPerson(personIdx)} />
                )}
              </div>
              <div className="mt-2">
                {items
                  .filter((item) => item.name !== "")
                  .map((item, itemIdx) => (
                    <div
                      key={`itemcheckbox${itemIdx}`}
                      className="form-control"
                    >
                      <label className="label cursor-pointer">
                        <span className="label-text">{item.name}</span>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={person.items.indexOf(item.name) >= 0}
                          onChange={onPersonItemsChange(personIdx, item.name)}
                        />
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <AddButton onClick={onAddPerson}>Add person</AddButton>
        </div>
        <h1 className="text-2xl font-bold mt-4">Algorithm</h1>
        <select
          className="select select-bordered w-full mt-4"
          value={algorithm}
          onChange={(e) =>
            setAlgorithm(e.target.value as Algorithm, {
              scroll: false,
              shallow: true,
            })
          }
        >
          {Object.values(Algorithm).map((algo) => (
            <option key={`algo${algo}`} value={algo}>
              {algo.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary mt-4"
          onClick={runLottery}
          disabled={!canRunLottery}
        >
          Run lottery
        </button>
        {itemAssignments !== undefined && (
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold mt-4">Item assignments</h1>
            <div className="overflow-x-auto mt-4">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {itemAssignments.map((result, idx) => (
                    <tr key={`result${idx}`}>
                      <td>{result.item}</td>
                      <td>{result.assignee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn mt-4" onClick={setItemClaims}>
              Set item claims above
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function AddButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="btn gap-2" {...props}>
      {props.children}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 18L12 6M6 12l12 0"
        />
      </svg>
    </button>
  );
}

function DeleteButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="btn btn-square ml-2" {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

function randomItemAssignment(
  items: Item[],
  people: Person[]
): ItemAssignment[] {
  const winners: ItemAssignment[] = [];
  items.forEach((item) => {
    if (people.find((p) => p.name === item.claimedBy)) {
      winners.push({ item: item.name, assignee: item.claimedBy! });
      return;
    }

    const peopleInterestedInItem = people.filter((person) =>
      person.items.includes(item.name)
    );
    if (peopleInterestedInItem.length > 0) {
      const winnerIdx = Math.floor(
        Math.random() * peopleInterestedInItem.length
      );
      const winner = peopleInterestedInItem[winnerIdx];
      winners.push({ item: item.name, assignee: winner.name });
    }
  });
  return winners;
}

function maxScoredAssignment(
  items: Item[],
  people: Person[],
  scoringFunctions: ((
    people: Person[],
    assignment: ItemAssignment[]
  ) => number)[]
): ItemAssignment[] {
  function assignItems(
    assignments: ItemAssignment[],
    itemIdx: number
  ): ItemAssignment[][] {
    const item = items[itemIdx];
    const returnAssignments: ItemAssignment[][] = [];

    if (item === undefined) {
      return [assignments];
    }

    if (people.find((p) => p.name === item.claimedBy)) {
      const newAssignments = [
        ...assignments,
        { item: item.name, assignee: item.claimedBy! },
      ];
      return assignItems(newAssignments, itemIdx + 1);
    }

    const peopleInterestedInItem = people.filter((person) =>
      person.items.includes(item.name)
    );
    if (peopleInterestedInItem.length === 0) {
      return assignItems(assignments, itemIdx + 1);
    }

    for (let i = 0; i < peopleInterestedInItem.length; i++) {
      const person = peopleInterestedInItem[i];
      const newAssignments = [
        ...assignments,
        { item: item.name, assignee: person.name },
      ];
      if (itemIdx === items.length - 1) {
        returnAssignments.push(newAssignments);
      } else {
        const assignmentsForIter = assignItems(newAssignments, itemIdx + 1);
        returnAssignments.push(...assignmentsForIter);
      }
    }

    return returnAssignments;
  }

  const allAssignments = assignItems([], 0);
  let bestAssignments: ItemAssignment[][] = allAssignments;

  for (const scoringFunction of scoringFunctions) {
    const scoredAssignments = bestAssignments.map((assignment) => {
      return { assignment, score: scoringFunction(people, assignment) };
    });
    const maxAssignmentScore = scoredAssignments.reduce(
      (max, cur) => (cur.score > max ? cur.score : max),
      0
    );
    bestAssignments = scoredAssignments
      .filter((a) => a.score === maxAssignmentScore)
      .map((a) => a.assignment);

    if (bestAssignments.length === 1) {
      break;
    }
  }

  const bestAssignment =
    bestAssignments[Math.floor(Math.random() * bestAssignments.length)];

  return bestAssignment;
}

function minimizeGiniCoefficient(
  people: Person[],
  assignment: ItemAssignment[]
): number {
  const resourcesForPerson = new Map<string, number>();
  for (const person of people) {
    resourcesForPerson.set(person.name, 0);
  }

  for (const itemAssignment of assignment) {
    const resources = resourcesForPerson.get(itemAssignment.assignee);
    if (resources === undefined) {
      throw new Error("Invalid assignment");
    }
    resourcesForPerson.set(itemAssignment.assignee, resources + 1);
  }

  return 1 - calculateGiniCoefficient(Array.from(resourcesForPerson.values()));
}

function minimizeNumPickups(
  people: Person[],
  assignment: ItemAssignment[]
): number {
  const allAssignees = new Set<string>();
  for (const itemAssignment of assignment) {
    allAssignees.add(itemAssignment.assignee);
  }

  return people.length - allAssignees.size;
}

function calculateGiniCoefficient(distribution: number[]): number {
  // Sort the distribution in ascending order
  const sortedDist = distribution.slice().sort((a, b) => a - b);

  // Calculate the sum of absolute differences
  const n = distribution.length;
  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      sumDiff += Math.abs(sortedDist[j] - sortedDist[i]);
    }
  }

  // Calculate the Gini coefficient using the formula
  const A = sumDiff / (2 * n * n);
  const G = A / 0.5;

  return G;
}
