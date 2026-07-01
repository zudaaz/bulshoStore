const Account = require("../models/Account");

function paymentAccount(paymentMethod) {
  if (paymentMethod === "cash") return "cash";
  if (paymentMethod === "bank") return "bank";
  if (paymentMethod === "mobile_money") return "mobile_money";
  return null;
}

function sourceKey(sourceType, sourceId, sourceAction) {
  return `${String(sourceType).toUpperCase()}:${String(sourceId)}:${String(sourceAction).toUpperCase()}`;
}

exports.paymentAccount = paymentAccount;
exports.ledgerSourceKey = sourceKey;

exports.createSystemEntry = async ({
  owner,
  createdBy,
  title,
  type,
  paymentMethod,
  account,
  amount,
  date = new Date(),
  note = "",
  referenceNumber = "",
  sourceType,
  sourceId,
  sourceAction = "PRIMARY"
}) => {
  const normalizedAmount = Number(amount || 0);
  const normalizedAccount = account || paymentAccount(paymentMethod);
  if (!normalizedAccount || normalizedAmount <= 0) return null;

  const key = sourceKey(sourceType, sourceId, sourceAction);
  return Account.findOneAndUpdate(
    { user: owner, sourceKey: key },
    {
      $setOnInsert: {
        user: owner,
        createdBy,
        title,
        type,
        account: normalizedAccount,
        amount: normalizedAmount,
        date,
        note,
        referenceNumber,
        sourceType,
        sourceId,
        sourceAction,
        sourceKey: key,
        isSystemGenerated: true,
        isDeleted: false
      }
    },
    { new: true, upsert: true, runValidators: true }
  );
};

exports.deleteSystemEntry = async ({ owner, sourceType, sourceId, sourceAction }) => {
  const key = sourceKey(sourceType, sourceId, sourceAction);
  await Account.deleteOne({ user: owner, sourceKey: key, isSystemGenerated: true });
};

exports.syncExpenseEntry = async (expense, owner, createdBy) => {
  const key = sourceKey("expense", expense._id, "PRIMARY");
  const account = paymentAccount(expense.paymentMethod);
  const shouldRecord = expense.status === "approved" && account && !expense.isDeleted;

  if (!shouldRecord) {
    await Account.updateOne(
      { user: owner, sourceKey: key, isSystemGenerated: true },
      { $set: { isDeleted: true } }
    );
    return null;
  }

  return Account.findOneAndUpdate(
    { user: owner, sourceKey: key },
    {
      $set: {
        createdBy,
        title: `Expense: ${expense.title}`,
        type: "expense",
        account,
        amount: Number(expense.amount),
        date: expense.date,
        note: expense.description || "",
        referenceNumber: expense.referenceNumber || "",
        sourceType: "expense",
        sourceId: expense._id,
        sourceAction: "PRIMARY",
        sourceKey: key,
        isSystemGenerated: true,
        isDeleted: false
      },
      $setOnInsert: { user: owner }
    },
    { new: true, upsert: true, runValidators: true }
  );
};
