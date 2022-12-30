const bookModel = require("../models/bookModel.js");
const userModel = require("../models/userModel.js");
const reviewsModel = require("../models/reviewModel");
const mongoose = require("mongoose");
const moment = require("moment");
const { uploadFile } = require("./awsController");
const {
  validateString,
  convertToArray,
  validateRequest,
  validateObjectId,
  isValidISBN,
} = require("../validator/validation");

// ===================================================CREATE URL BY AWS FUNCTION=======================================================

// =======================================================POST BOOK ==============================================================

const createBook = async function (req, res) {
  try {
    let { title, excerpt, userId, ISBN, category, subcategory, releasedAt } =
      req.body;
    let book = {};
    let bookCover = req.files;
    if (!validateRequest(req.body)) {
      return res
        .status(400)
        .json({ status: false, message: "Please input valid request" });
    }

    if (!title) {
      return res
        .status(400)
        .json({ status: false, message: "Title is required" });
    }
    if (!validateString(title)) {
      return res
        .status(400)
        .json({ status: false, message: "Enter a valid title" });
    }

    if (!excerpt) {
      return res
        .status(400)
        .json({ status: false, message: "Excerpt is required" });
    }
    if (!validateString(excerpt)) {
      return res
        .status(400)
        .json({ status: false, message: "Enter a valid excerpt" });
    }
    book.excerpt = excerpt;

    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "userId is required" });
    }

    if (!validateObjectId(userId)) {
      return res.status(400).json({ status: false, message: "Invalid userId" });
    }
    book.userId = userId;

    if (!ISBN) {
      return res
        .status(400)
        .json({ status: false, message: "please provide ISBN" });
    }

    if (!isValidISBN(ISBN)) {
      return res
        .status(400)
        .json({ status: false, message: "please provide a valid ISBN" });
    }
    const isDuplicate = await bookModel.findOne({
      $or: [{ ISBN: ISBN }, { title: title }],
    });
    if (isDuplicate) {
      return res.status(400).json({
        status: false,
        message: "This ISBN or title is already present in books collection",
      });
    }
    book.title = title;
    book.ISBN = ISBN;

    if (!category) {
      return res
        .status(400)
        .json({ status: false, message: "category  is required" });
    }
    if (!validateString(category)) {
      return res
        .status(400)
        .json({ status: false, message: "Enter a valid category" });
    }
    book.category = category;

    if (!subcategory) {
      return res
        .status(400)
        .json({ status: false, message: "Subcategory is required" });
    }
    let newSubcategory = convertToArray(subcategory);
    if (!newSubcategory) {
      return res
        .status(400)
        .json({ status: false, msg: "Invalid Subcategory." });
    }
    book.subcategory = newSubcategory;

    book.releasedAt = moment().format("YYYY-MM-DD, h:mm:ss a");

    if (bookCover && bookCover.length > 0) {
      let uploadedFileURL = await uploadFile(bookCover[0]);
      book.bookCover = uploadedFileURL;
    } else {
      return res
        .status(400)
        .json({ status: false, message: "bookcover is required" });
    }

    let createdBook = await bookModel.create(book);
    res.status(201).json({ status: true, data: createdBook });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

// ===============================================GET BOOK QUERY PARAM ==============================================================

const getBooks = async function (req, res) {
  try {
    if (!validateRequest(req.query)) {
      return res
        .status(400)
        .json({ status: false, message: "Please input valid request" });
    }

    const queryData = req.query;
    let { userId, category, subcategory } = queryData;

    getFilter = Object.keys(queryData);
    if (getFilter.length) {
      for (let value of getFilter) {
        if (["category", "userId", "subcategory"].indexOf(value) == -1)
          return res.status(400).json({
            status: false,
            message: `You can't filter Using '${value}' `,
          });
      }
    }

    let obj = {
      isDeleted: false,
    };

    if (Object.keys(queryData).length !== 0) {
      if (userId) {
        if (!validateObjectId(userId)) {
          return res
            .status(400)
            .json({ status: false, message: "Invalid userId" });
        }
        obj.userId = userId;
      }
      if (category && validateString(category)) {
        obj.category = category;
      }
      if (subcategory && validateString(subcategory)) {
        subcategory = subcategory.split(",").map((x) => x.trim());
        obj.subcategory = { $in: subcategory };
      }
    }

    let find = await bookModel
      .find(obj)
      .select({
        ISBN: 0,
        subcategory: 0,
        createdAt: 0,
        updatedAt: 0,
        __v: 0,
        isDeleted: 0,
      })
      .sort({ title: 1 });

    if (find.length == 0) {
      return res.status(404).json({
        status: false,
        message: "No such book found",
      });
    }
    res.status(200).json({
      status: true,
      message: "Book List",
      data: find,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// ======================================================GET BOOK BY BOOK ID =======================================================

const getBookById = async function (req, res) {
  try {
    const bookId = req.params.bookId;
    if (!validateObjectId(bookId)) {
      return res.status(400).json({
        status: false,
        message: "Bookid invalid",
      });
    }
    const data = await bookModel.findOne({ _id: bookId });

    if (!data) {
      return res.status(404).json({
        status: false,
        message: "Book does not exist",
      });
    }

    const reviewArray = await reviewsModel
      .find({
        bookId: data._id,
        isDeleted: false,
      })
      .select({ _v: 0, isDeleted: 0 });

    let find = await bookModel
      .findOne({ _id: bookId, isDeleted: false }, { ISBN: 0, __v: 0 })
      .lean();
    if (!find) {
      return res.status(404).json({ status: false, message: "data not found" });
    }
    find.reviewsData = reviewArray;

    return res.status(200).json({
      status: true,
      message: "Book List",
      data: find,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// =================================================UPDATE BOOK BY BOOKID ==============================================================

const updateBook = async function (req, res) {
  try {
    let id = req.params.bookId;
    let data = req.body;

    if (!validateObjectId(id)) {
      return res
        .status(400)
        .json({ status: false, message: "please provide a valid bookId" });
    }
    if (!validateRequest(data)) {
      return res
        .status(400)
        .json({ status: false, message: "please provide body data" });
    }
    let book = await bookModel.findOne({ _id: id, isDeleted: false });

    if (!book) {
      return res
        .status(404)
        .json({ status: true, message: "No such book found" });
    }
    if (!validateString(data.title)) {
      return res
        .status(400)
        .json({ status: false, message: "please provide valid title" });
    }
    let duplicateTitle = await bookModel.find({ title: data.title });

    if (duplicateTitle.length != 0) {
      return res
        .status(400)
        .json({ status: false, message: "this title is already present" });
    } else {
      book.title = data.title;
    }

    if (!validateString(data.excerpt)) {
      return res
        .status(400)
        .json({ status: false, message: "please provide valid excerpt" });
    } else {
      book.excerpt = data.excerpt;
    }

    if (!validateString(data.ISBN)) {
      return res
        .status(400)
        .json({ status: false, message: "Please provide ISBN" });
    }
    if (data.ISBN && !isValidISBN(data.ISBN)) {
      return res
        .status(400)
        .json({ status: false, message: "ISBN must be in right format" });
    }
    let duplicateISBN = await bookModel.find({ ISBN: data.ISBN });
    if (duplicateISBN.length != 0) {
      return res
        .status(400)
        .json({ status: false, message: "This ISBN is already present" });
    } else {
      book.ISBN = data.ISBN;
    }

    if (data.releasedAt) {
      if (!validateString(data.releasedAt)) {
        return res
          .status(400)
          .json({ status: false, message: "Provide a valid releasedAt" });
      }
      if (!moment(data.releasedAt, "YYYY-MM-DD", true).isValid()) {
        return res.status(400).json({
          status: false,
          message: "Enter the date in 'YYYY-MM-DD' format",
        });
      }
    } else {
      book.releasedAt = data.releasedAt;
    }

    let updateData = await bookModel.findOneAndUpdate(
      { _id: id },
      { $set: book },
      {
        new: true,
      }
    );
    res
      .status(200)
      .json({ status: true, message: " Data is Updated ", data: updateData });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
};

// =====================================================DELETE BOOK BY BOOK ID ============================================================

const deleteBook = async function (req, res) {
  try {
    let bookId = req.params.bookId;

    if (!validateObjectId(bookId)) {
      return res
        .status(400)
        .json({ status: false, msg: "Please enter a valid bookId" });
    }

    let book = await bookModel.findOneAndUpdate(
      { _id: bookId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!book) {
      return res.status(404).json({ status: false, message: "No book found " });
    }
    return res.status(200).json({ status: true, message: "Success" });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {
  createBook,
  getBooks,
  updateBook,
  deleteBook,
  getBookById,
};
