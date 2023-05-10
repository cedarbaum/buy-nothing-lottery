import { queryTypes, useQueryState, useQueryStates } from "next-usequerystate";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

enum Algorithm {
  RANDOM = "random",
  FAIREST = "fairest",
}

type Item = {
  name: string;
  people: string[];
};

type ItemWinner = {
  item: string;
  winner: string;
};

function randomItemAssignment(items: Item[]): ItemWinner[] {
  const winners: ItemWinner[] = [];
  items.forEach((item) => {
    if (item.people.length > 0) {
      const winnerIdx = Math.floor(Math.random() * item.people.length);
      const winner = item.people[winnerIdx];
      winners.push({ item: item.name, winner });
    }
  });
  return winners;
}

function fairestItemAssignment(items: Item[]): ItemWinner[] {
  function assignItems(
    assignments: ItemWinner[],
    itemIdx: number
  ): ItemWinner[][] {
    const item = items[itemIdx];
    const returnAssignments: ItemWinner[][] = [];

    if (item === undefined) {
      return [assignments];
    }

    if (item.people.length === 0) {
      return assignItems(assignments, itemIdx + 1);
    }

    for (let i = 0; i < item.people.length; i++) {
      const person = item.people[i];
      const newAssignments = [
        ...assignments,
        { item: item.name, winner: person },
      ];
      if (itemIdx == items.length - 1) {
        returnAssignments.push(newAssignments);
      } else {
        const assignmentsForIter = assignItems(newAssignments, itemIdx + 1);
        returnAssignments.push(...assignmentsForIter);
      }
    }

    return returnAssignments;
  }

  if (items.length === 0) {
    return [];
  }

  const allAssignments = assignItems([], 0);
  const scoredAssignments = allAssignments.map((assignment) => {
    return { assignment, score: new Set(assignment.map((i) => i.winner)).size };
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

export default function Home() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [canRunLottery, setCanRunLottery] = useState(false);
  const [lotteryResults, setLotteryResults] = useState<
    ItemWinner[] | undefined
  >(undefined);

  const [{ names, items }, setNamesAndItems] = useQueryStates({
    names: queryTypes.array(queryTypes.string).withDefault([""]),
    items: queryTypes
      .array(queryTypes.json<Item>())
      .withDefault([{ name: "", people: [] }]),
  });

  const [algorithm, setAlgorithm] = useQueryState(
    "algorithm",
    queryTypes
      .stringEnum(Object.values(Algorithm))
      .withDefault(Algorithm.RANDOM)
  );

  const onTextChange = (index: number) => (e: any) => {
    const newNames = [...names];
    newNames[index] = e.target.value;
    setNamesAndItems(
      { items, names: newNames },
      { scroll: false, shallow: true }
    );
  };

  const onAddPerson = () => {
    setNamesAndItems(
      { items, names: [...names, ""] },
      { scroll: false, shallow: true }
    );
  };

  const onDelPerson = (index: number) => () => {
    const newNames = [...names];
    newNames.splice(index, 1);
    setNamesAndItems(
      { items, names: newNames },
      { scroll: false, shallow: true }
    );
  };

  const onItemNameChange = (index: number) => (e: any) => {
    const newItems = [...items];
    newItems[index].name = e.target.value;
    setNamesAndItems(
      { names, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  const onItemPeopleChange = (index: number, person: string) => (e: any) => {
    const newItems = [...items];
    if (e.target.checked) {
      newItems[index].people = [...newItems[index].people, person];
    } else {
      newItems[index].people = newItems[index].people.filter(
        (p) => p !== person
      );
    }
    setNamesAndItems(
      { names, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  const onAddItem = () => {
    setNamesAndItems(
      { names, items: [...items, { name: "", people: [] }] },
      {
        scroll: false,
        shallow: true,
      }
    );
  };

  const onDelItem = (index: number) => () => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setNamesAndItems(
      { names, items: newItems },
      { scroll: false, shallow: true }
    );
  };

  const runLottery = () => {
    const newNames: string[] = [];
    names.forEach((name) => {
      if (newNames.indexOf(name) < 0 && name !== "") {
        newNames.push(name);
      }
    });

    const newItems: Item[] = [];
    items.forEach((item) => {
      if (item.name !== "") {
        const newPeople: string[] = [];
        item.people.forEach((person) => {
          if (newNames.indexOf(person) >= 0) {
            newPeople.push(person);
          }
        });
        newItems.push({ name: item.name, people: newPeople });
      }
    });

    const itemAssignments = (() => {
      switch (algorithm) {
        case Algorithm.RANDOM:
          return randomItemAssignment(newItems);
        case Algorithm.FAIREST:
          return fairestItemAssignment(newItems);
      }
    })();

    setNamesAndItems(
      { names: newNames, items: newItems },
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
      names.filter((n) => n !== "").length > 0 &&
        items.filter(
          (i) =>
            i.name !== "" &&
            i.people.filter((p) => names.indexOf(p) >= 0).length > 0
        ).length > 0
    );
  }, [names, items]);

  if (!router.isReady || !hydrated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="flex flex-col p-4">
        <h1 className="text-2xl font-bold">People</h1>
        <div className="card mt-4">
          {names.map((name, idx) => (
            <div
              key={`person${idx}`}
              className="flex flex-row items-center card bg-base-100 mb-4"
            >
              <div className="form-control w-full">
                <label className="input-group">
                  <span>Person {idx + 1}</span>
                  <input
                    type="text"
                    placeholder="Name..."
                    className="input input-bordered"
                    value={name}
                    onChange={onTextChange(idx)}
                  />
                </label>
              </div>
              {idx > 0 && <DeleteButton onClick={onDelPerson(idx)} />}
            </div>
          ))}
          <AddButton onClick={onAddPerson}>Add person</AddButton>
        </div>
        <h1 className="text-2xl font-bold mt-4">Items</h1>
        <div className="card mt-4">
          {items.map((item, itemIdx) => (
            <div
              key={`item${itemIdx}`}
              className="card bg-base-100 mb-4 border border-color-primary p-4"
            >
              <div className="flex flex-row items-center ">
                <div className="form-control w-full">
                  <label className="input-group">
                    <span>Item {itemIdx + 1}</span>
                    <input
                      type="text"
                      placeholder="Item name..."
                      className="input input-bordered"
                      value={item.name}
                      onChange={onItemNameChange(itemIdx)}
                    />
                  </label>
                </div>
                {itemIdx > 0 && <DeleteButton onClick={onDelItem(itemIdx)} />}
              </div>
              <div className="mt-2">
                {names
                  .filter((name) => name !== "")
                  .map((name, nameIdx) => (
                    <div key={`checkbox${nameIdx}`} className="form-control">
                      <label className="label cursor-pointer">
                        <span className="label-text">{name}</span>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={item.people.indexOf(name) >= 0}
                          onChange={onItemPeopleChange(itemIdx, name)}
                        />
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <AddButton onClick={onAddItem}>Add item</AddButton>
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
