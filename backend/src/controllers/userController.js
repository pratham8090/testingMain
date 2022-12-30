let userModel = require("../models/userModel");
let jwt = require("jsonwebtoken");

const {
  validateString,
  validateRequest,
  regxValidator,
  regexNumber,
  passwordLength,
  validateEnum,
} = require("../validator/validation");

const validator = require("validator");
const { response } = require("express");

//  <=================================>[CREATE USER API] <==============================>

const createUser = async function (req, res) {
  try {
    let user = req.body;

    if (!validateRequest(user)) {
      return res
        .status(400)
        .json({ status: false, message: "details is required in body" });
    }

    if (!validateString(user.title)) {
      return res
        .status(400)
        .json({ status: false, message: "title is required" });
    }
    if (!validateEnum(user.title)) {
      return res
        .status(400)
        .json({ status: false, message: "title must be 'Mr' /'Mrs' /'Miss'" });
    }

    if (!validateString(user.name)) {
      return res
        .status(400)
        .json({ status: false, message: "name is required" });
    }
    if (!regxValidator(user.name)) {
      return res
        .status(400)
        .json({ status: false, message: "please provide a valid name" });
    }

    if (!validateString(user.phone)) {
      return res
        .status(400)
        .json({ status: false, message: "phone is required" });
    }
    if (!regexNumber(user.phone)) {
      return res.status(400).json({
        status: false,
        message:
          "please enter a valid number/number must be start with 9/8/7/6",
      });
    }

    if (!validateString(user.email)) {
      return res
        .status(400)
        .json({ status: false, message: "email is required" });
    }
    if (!validator.isEmail(user.email)) {
      return res
        .status(400)
        .json({ status: false, message: "email is not correct" });
    }
    const checkDuplicate = await userModel.findOne({
      $or: [{ email: user.email }, { phone: user.phone }],
    });
    if (checkDuplicate) {
      return res.status(400).json({
        status: false,
        message: `email ${user.email} or phone ${user.phone} is already used`,
      });
    }
    if (!passwordLength(user.password)) {
      return res
        .status(400)
        .json({ status: false, message: "password must be between 8 to 15" });
    }
    if (user.address) {
      if (user.address.street && !validateString(user.address.street)) {
        return res
          .status(400)
          .json({ status: false, message: "please provide street" });
      }
      if (user.address.city && !validateString(user.address.city)) {
        return res
          .status(400)
          .json({ status: false, message: "please provide city" });
      }
      if (user.address.pincode && !validateString(user.address.pincode)) {
        return res
          .status(400)
          .json({ status: false, message: "please provide pincode" });
      }
    }
    let userCreated = await userModel.create(user);
    res.status(201).json({
      status: true,
      message: "Success",
      data: userCreated,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

//  <=================================>[USER LOGIN API] <==============================>

let userLogin = async function (req, res) {
  try {
    if (!validateRequest(req.body)) {
      return res
        .status(400)
        .json({ status: false, message: "details is required in body" });
    }
    let { email, password } = req.body;
    if (!validateString(email)) {
      return res
        .status(400)
        .json({ status: false, message: "email is required" });
    }
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ status: false, message: "email is not correct" });
    }
    if (!validateString(password) || !passwordLength(password)) {
      return res.status(400).json({
        status: false,
        message: "password is required and should be of 8 to 15 characters",
      });
    }

    let user = await userModel.findOne({ email: email, password: password });
    if (!user)
      return res.status(400).json({
        status: false,
        message: "email or the password is not correct",
      });
    let token = jwt.sign(
      {
        userId: user._id.toString(),
        iat: new Date().getTime(),
        expiresIn: "24h",
      },
      "functionup-radon"
    );
    // res.setHeader("x-api-key", token);
    res.status(200).json({ status: true, message: "Success", data: token });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = { createUser, userLogin };
