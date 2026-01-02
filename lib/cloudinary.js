import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

export const ensureCloudinaryConfigured = () => {
    if (isConfigured) return { ok: true };

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        return {
            ok: false,
            error: "Cloudinary env vars missing (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
        };
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });

    isConfigured = true;
    return { ok: true };
};

export const uploadImageToCloudinary = async (file, { folder = "products" } = {}) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                folder,
            },
            (err, result) => {
                if (err) return reject(err);
                return resolve(result);
            }
        );

        stream.end(buffer);
    });
};

export const uploadImagesToCloudinary = async (files, { folder = "products" } = {}) => {
    const urls = [];
    for (const f of files) {
        const uploaded = await uploadImageToCloudinary(f, { folder });
        if (uploaded?.secure_url) urls.push(uploaded.secure_url);
    }
    return urls;
};
