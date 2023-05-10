import { queryTypes, useQueryState, useQueryStates } from "next-usequerystate";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

enum Algorithm {
  RANDOM = "random",
  FAIREST = "fairest",
}

type Person = {
  name: string;
  items: string[];
};

type ItemWinner = {
  item: string;
  winner: string;
};

export default function Home() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [canRunLottery, setCanRunLottery] = useState(false);
  const [lotteryResults, setLotteryResults] = useState<
    ItemWinner[] | undefined
  >(undefined);

  const [{ items, people }, setItemsAndPeople] = useQueryStates({
    items: queryTypes.array(queryTypes.string).withDefault([""]),
    people: queryTypes
      .array(queryTypes.json<Person>())
      .withDefault([{ name: "", items: [] }]),
  });

  const [algorithm, setAlgorithm] = useQueryState(
    "algorithm",
    queryTypes
      .stringEnum(Object.values(Algorithm))
      .withDefault(Algorithm.RANDOM)
  );

  const onItemTextChange = (index: number) => (e: any) => {
    const newItems = [...items];
    newItems[index] = e.target.value;
    setItemsAndPeople(
      { people, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  const onAddItem = () => {
    setItemsAndPeople(
      { people, items: [...items, ""] },
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

  const runLottery = () => {
    const newItems: string[] = [];
    items.forEach((name) => {
      if (newItems.indexOf(name) < 0 && name !== "") {
        newItems.push(name);
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
          return fairestItemAssignment(newItems, newPeople);
      }
    })();

    setItemsAndPeople(
      { people: newPeople, items: newItems },
      { scroll: false, shallow: true }
    );
    setLotteryResults(itemAssignments);
  };

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Scoll to bottom
    if (lotteryResults) window.scrollTo(0, document.body.scrollHeight);
  }, [lotteryResults]);

  useEffect(() => {
    setCanRunLottery(
      items.filter((i) => i !== "").length > 0 &&
        people.filter(
          (p) =>
            p.name !== "" &&
            p.items.filter((p) => items.indexOf(p) >= 0).length > 0
        ).length > 0
    );
  }, [people, items]);

  if (!router.isReady || !hydrated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex flex-col p-4">
        <h1 className="text-2xl font-bold">Items</h1>
        <div className="card mt-4">
          {items.map((item, idx) => (
            <div
              key={`item${idx}`}
              className="flex flex-row items-center card bg-base-100 mb-4"
            >
              <div className="form-control w-full">
                <label className="input-group">
                  <span>Item {idx + 1}</span>
                  <input
                    type="text"
                    placeholder="Item..."
                    className="input input-bordered"
                    value={item}
                    onChange={onItemTextChange(idx)}
                  />
                </label>
              </div>
              {(idx > 0 || items.length > 1) && (
                <DeleteButton onClick={onDelItem(idx)} />
              )}
            </div>
          ))}
          <AddButton onClick={onAddItem}>Add item</AddButton>
        </div>
        <h1 className="text-2xl font-bold mt-4">People</h1>
        <div className="card mt-4">
          {people.map((person, personIdx) => (
            <div
              key={`person${personIdx}`}
              className="card bg-base-100 mb-4 border border-color-primary p-4"
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
                  .filter((item) => item !== "")
                  .map((item, itemIdx) => (
                    <div
                      key={`itemcheckbox${itemIdx}`}
                      className="form-control"
                    >
                      <label className="label cursor-pointer">
                        <span className="label-text">{item}</span>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={person.items.indexOf(item) >= 0}
                          onChange={onPersonItemsChange(personIdx, item)}
                        />
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <AddButton onClick={onAddPerson}>Add person</AddButton>
        </div>
        <select
          className="select select-bordered  w-full mt-4"
          value={algorithm.toUpperCase()}
          onChange={(e) =>
            setAlgorithm(e.target.value.toLowerCase() as Algorithm, {
              scroll: false,
              shallow: true,
            })
          }
        >
          {Object.keys(Algorithm).map((algo) => (
            <option key={`algo${algo}`} value={algo}>
              {algo}
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
        {lotteryResults !== undefined && (
          <div className="overflow-x-auto mt-4">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {lotteryResults.map((result, idx) => (
                  <tr key={`result${idx}`}>
                    <td>{result.item}</td>
                    <td>{result.winner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function randomItemAssignment(items: string[], people: Person[]): ItemWinner[] {
  const winners: ItemWinner[] = [];
  items.forEach((item) => {
    const peopleInterestedInItem = people.filter((person) =>
      person.items.includes(item)
    );
    if (peopleInterestedInItem.length > 0) {
      const winnerIdx = Math.floor(
        Math.random() * peopleInterestedInItem.length
      );
      const winner = peopleInterestedInItem[winnerIdx];
      winners.push({ item: item, winner: winner.name });
    }
  });
  return winners;
}

function fairestItemAssignment(
  items: string[],
  people: Person[]
): ItemWinner[] {
  function assignItems(
    assignments: ItemWinner[],
    itemIdx: number
  ): ItemWinner[][] {
    const item = items[itemIdx];
    const returnAssignments: ItemWinner[][] = [];

    if (item === undefined) {
      return [assignments];
    }

    const peopleInterestedInItem = people.filter((person) =>
      person.items.includes(item)
    );
    if (peopleInterestedInItem.length === 0) {
      return assignItems(assignments, itemIdx + 1);
    }

    for (let i = 0; i < peopleInterestedInItem.length; i++) {
      const person = peopleInterestedInItem[i];
      const newAssignments = [...assignments, { item, winner: person.name }];
      if (itemIdx == items.length - 1) {
        returnAssignments.push(newAssignments);
      } else {
        const assignmentsForIter = assignItems(newAssignments, itemIdx + 1);
        returnAssignments.push(...assignmentsForIter);
      }
    }

    return returnAssignments;
  }

  function getScoreForAssignment(assignment: ItemWinner[]): number {
    const resourcesForPerson = new Map<string, number>();
    for (const person of people) {
      resourcesForPerson.set(person.name, 0);
    }

    for (const itemWinner of assignment) {
      const resources = resourcesForPerson.get(itemWinner.winner);
      if (resources === undefined) {
        throw new Error("Invalid assignment");
      }
      resourcesForPerson.set(itemWinner.winner, resources + 1);
    }

    return (
      1 - calculateGiniCoefficient(Array.from(resourcesForPerson.values()))
    );
  }

  const allAssignments = assignItems([], 0);
  const scoredAssignments = allAssignments.map((assignment) => {
    return { assignment, score: getScoreForAssignment(assignment) };
  });
  const maxAssignmentScore = scoredAssignments.reduce(
    (max, cur) => (cur.score > max ? cur.score : max),
    0
  );
  const allAssignmentsWithMaxScore = scoredAssignments
    .filter((a) => a.score == maxAssignmentScore)
    .map((a) => a.assignment);
  const winners =
    allAssignmentsWithMaxScore[
      Math.floor(Math.random() * allAssignmentsWithMaxScore.length)
    ];

  return winners;
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
