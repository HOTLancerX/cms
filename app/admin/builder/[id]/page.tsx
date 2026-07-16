import BuilderEditor from "@/components/builder/Builder";
import connectDB from "@/lib/mongodb";
import MenuModel from "@/models/Menu";

export default async function BuilderEditPage() {
    await connectDB();
    const menus = await MenuModel.find({ status: "active" }).lean();
    const serializedMenus = JSON.parse(JSON.stringify(menus));

    return <BuilderEditor initialMenus={serializedMenus} />;
}
