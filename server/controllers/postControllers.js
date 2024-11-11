const Post= require('../models/postModel')
const User= require('../models/userModel')
const path= require('path')
const fs= require('fs')
const {v4: uuid} = require('uuid')
const HttpError = require('../models/errorModel')


//==============CREATE POST
//POST: api/posts
//PROTECTED
const createPost = async (req,res, next) => {
    try {
        let {title, category, description}= req.body;
        if(!title || !category || !description || !req.files){
            return next(new HttpError("Fill in all fields and choose a thumbnail.",422));
        }
        const {thumbnail} = req.files;
        //check file size
        if(thumbnail.size > 2000000){
            return next(new HttpError("Thumbnail is too large. File should be less than 2Mb",422))
        }
        let filename=thumbnail.name;
        let splitFilename= filename.split('.');
        let newFilename= splitFilename[0]+uuid()+"."+splitFilename[splitFilename.length-1];
        thumbnail.mv(path.join(__dirname,'..','/uploads', newFilename), async (err)=>{
            if(err){
                return next(new HttpError(err))
            }else{
                const newPost = await Post.create({title, category, description, thumbnail: newFilename,
                    creator: req.user.id
                })
                if(!newPost){
                    return next(new HttpError("Post couldn't be created.", 422))
                }
                //find user and increase post count
                const currentUser = await User.findById(req.user.id);
                const userPostCount = currentUser.posts + 1;
                await User.findByIdAndUpdate(req.user.id, {posts: userPostCount});

                res.status(201).json(newPost);
            }
        })

    } catch (error) {
        return next(new HttpError(error));
    }
}

//==============GET ALL POSTS
//GET: api/posts
//PROTECTED
const getPosts = async (req,res, next) => {
    try {
        const posts = await Post.find().sort({updatedAt: -1})
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
}

//============== GET SINGLE POST
//GET: api/posts/:id
//UNPROTECTED
const getPost = async (req,res, next) => {
    try {
        const postId=  req.params.id;
        const post = await Post.findById(postId);
        if(!post){
            return next(new HttpError("Post not found", 404));
        }
        res.status(200).json(post);
    } catch (error) {
        return next(new HttpError(error));
    }
}

//==============GET POSTS BY CATEGORY
//GET: api/posts/categories/:category
//UNPROTECTED
const getCategoryPosts = async (req,res, next) => {
    try {
        const {category} = req.params;
        const categoryPosts = await Post.find({category}).sort({createdAt: -1})
        res.status(200).json(categoryPosts);
    } catch (error) {
        return next(new HttpError(error));
    }
}

//==============GET AUTHOR POSTS
//GET: api/posts/users/:id
//UNPROTECTED
const getUserPosts = async (req,res, next) => {
    try {
        const {id} = req.params;
        const posts = await Post.find({creator: id}).sort({createdAt: -1});
        res.status(200).json(posts);

    } catch (error) {
        return next(new HttpError(error));
    }
}


//==============EDIT POST
//PATCH: api/posts/:id
//PROTECTED
const editPost = async (req,res, next) => {
    try {
        let fileName, newFilename, updatedPost;
        const postId = req.params.id;
        let {title, category, description} = req.body;
        //ReactQuill has a <p>, </p> and a <br/> by default so it already has 11 characters
        if(!title || !category || description.length < 12){
            return next(new HttpError("Fill in all fields.", 422))
        }
        //get old post from DB
        const oldPost = await Post.findById(postId);
        if(oldPost.creator==req.user.id){
            if(!req.files){
                //if there is no new thumbnail
                updatedPost = await Post.findByIdAndUpdate(postId, {title, category, description}, {new: true})
            }else {
                //delete old thumbnail
                fs.unlink(path.join(__dirname,'..','/uploads', oldPost.thumbnail), async (err)=>{
                    if(err){
                        return next(new HttpError(err));
                    }
                })
                //upload new thumbnail
                const {thumbnail} = req.files;
                //check size
                if(thumbnail.size > 2000000){
                    return next(new HttpError("Thumbnail is too large, should be less than 2Mb"))
                }
                fileName = thumbnail.name;
                let splitFilename = fileName.split('.');
                newFilename = splitFilename[0]+ uuid()+ '.' + splitFilename[splitFilename.length-1];
                thumbnail.mv(path.join(__dirname,'..','/uploads', newFilename), async (err)=>{
                    if(err){
                        return next(new HttpError(err));
                    }
                })
                updatedPost = await Post.findByIdAndUpdate(postId, {title, description, category, thumbnail: newFilename}, {new: true});

                if(!updatedPost){
                    return next(new HttpError("Could not update post.",400))
                }}
            res.status(200).json(updatedPost);
        }else{
            return next(new HttpError("You cant edit posts that aren't yours.", 403));
        }    
    } catch (error) {
        return next(new HttpError(error));
    }
}


//==============DELETE POST
//DELETE: api/posts/:id
//PROTECTED
const deletePost = async (req,res, next) => {
    try {
        const postId = req.params.id;
        if(!postId){
            return next(new HttpError("Post unavailable.", 400));
        }
        const post = await Post.findById(postId);
        if(req.user.id == post.creator){
            fs.unlink(path.join(__dirname,'..','/uploads',post?.thumbnail), async (err) => {
            if(err){
                return next(new HttpError(err));
            }else{
                await Post.findByIdAndDelete(postId);
                //find user and reduce post count.
                const currentUser = await User.findById(req.user.id);
                const postCount = currentUser?.posts-1;
                await User.findByIdAndUpdate(req.user.id, {posts: postCount});

            }
        } )
        res.json(`Post ${postId} deleted successfuly`)
    }else{
        return next(new HttpError("You can't delete posts that are not yours",403));
    }

    } catch (error) {
        return next(new HttpError(error));
    }
}


module.exports= {createPost, getPosts, getPost, getCategoryPosts, getUserPosts, editPost, deletePost}