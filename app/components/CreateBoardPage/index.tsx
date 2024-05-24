import CreateBoard from 'components/CreateBoard';

const CreateBoardPage = () => {
  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      <div className="h-full flex items-center justify-center">
        <CreateBoard />
      </div>
    </div>
  );
};

export default CreateBoardPage;
